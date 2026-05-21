-- ============================================================================
-- Migration: 039_optimistic_insert_delete_rpc
-- Description: RPC functions for optimistic insert/delete in estimate editor.
--   Replaces 5-8 sequential HTTP calls with a single RPC + re-read.
--   Functions deployed individually (039a-039f) to avoid timeouts.
--   create_estimate_section: INSERT with number/sort_order derivation
--   add_work_from_directory_to_estimate: SELECT directory + INSERT work
--   add_material_from_directory_to_estimate: SELECT directory + resolve quantity + INSERT
--   archive_estimate_section: archive section + works + materials in one call
--   archive_estimate_work: archive work + its materials in one call
--   archive_estimate_material: archive single material (trigger handles recalc)
-- Date: 2026-05-21
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. create_estimate_section
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_estimate_section(
  p_workspace_owner_id uuid,
  p_project_id uuid,
  p_estimate_record_id uuid,
  p_title text,
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_number text;
  v_sort_order integer;
  v_section_id uuid;
BEGIN
  SELECT COALESCE(count(*), 0) + 1 INTO v_number
  FROM public.project_estimate_sections
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;

  SELECT COALESCE(max(sort_order), 0) + 1000 INTO v_sort_order
  FROM public.project_estimate_sections
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;

  INSERT INTO public.project_estimate_sections (
    workspace_owner_id, project_id, estimate_record_id,
    title, number, sort_order, created_by, updated_by
  ) VALUES (
    p_workspace_owner_id, p_project_id, p_estimate_record_id,
    p_title, v_number::text, v_sort_order, p_created_by, p_created_by
  )
  RETURNING id INTO v_section_id;

  RETURN v_section_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_estimate_section(uuid, uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_estimate_section(uuid, uuid, uuid, text, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. add_work_from_directory_to_estimate
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_work_from_directory_to_estimate(
  p_workspace_owner_id uuid,
  p_project_id uuid,
  p_estimate_record_id uuid,
  p_section_id uuid,
  p_directory_work_id uuid,
  p_quantity numeric,
  p_price numeric,
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_source record;
  v_section_exists boolean;
  v_number text;
  v_sort_order integer;
  v_work_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.project_estimate_sections
    WHERE workspace_owner_id = p_workspace_owner_id
      AND project_id = p_project_id
      AND estimate_record_id = p_estimate_record_id
      AND id = p_section_id
      AND archived_at IS NULL
      AND deleted_at IS NULL
  ) INTO v_section_exists;

  IF NOT v_section_exists THEN
    RAISE EXCEPTION 'Раздел не найден' USING ERRCODE = 'P0002';
  END IF;

  SELECT dw.id, dw.code, dw.title, dw.unit_code, dw.unit_label,
         dw.rate_amount, dw.category, dw.version
  INTO v_source
  FROM public.directory_works dw
  WHERE dw.workspace_owner_id = p_workspace_owner_id
    AND dw.id = p_directory_work_id
    AND dw.status = 'active'
    AND dw.deleted_at IS NULL;

  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Работа справочника не найдена' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(count(*), 0) + 1 INTO v_number
  FROM public.project_estimate_works
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND section_id = p_section_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;

  SELECT COALESCE(max(sort_order), 0) + 1000 INTO v_sort_order
  FROM public.project_estimate_works
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND section_id = p_section_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;

  INSERT INTO public.project_estimate_works (
    workspace_owner_id, project_id, estimate_record_id, section_id,
    directory_work_id, directory_work_version, number, code, title,
    unit_code, unit_label, quantity, price, category, sort_order,
    created_by, updated_by
  ) VALUES (
    p_workspace_owner_id, p_project_id, p_estimate_record_id, p_section_id,
    v_source.id, v_source.version, v_number::text, v_source.code, v_source.title,
    v_source.unit_code, v_source.unit_label, p_quantity, COALESCE(p_price, v_source.rate_amount),
    v_source.category, v_sort_order, p_created_by, p_created_by
  )
  RETURNING id INTO v_work_id;

  RETURN v_work_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_work_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_work_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. add_material_from_directory_to_estimate
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_material_from_directory_to_estimate(
  p_workspace_owner_id uuid,
  p_project_id uuid,
  p_estimate_record_id uuid,
  p_work_id uuid,
  p_directory_material_id uuid,
  p_quantity numeric,
  p_consumption numeric,
  p_price numeric,
  p_created_by uuid,
  p_changed_field text DEFAULT 'quantity'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_work record;
  v_source record;
  v_resolved_quantity numeric(14, 3);
  v_resolved_consumption numeric(14, 6);
  v_number text;
  v_sort_order integer;
  v_material_id uuid;
BEGIN
  SELECT pew.id, pew.section_id, pew.quantity
  INTO v_work
  FROM public.project_estimate_works pew
  WHERE pew.workspace_owner_id = p_workspace_owner_id
    AND pew.project_id = p_project_id
    AND pew.estimate_record_id = p_estimate_record_id
    AND pew.id = p_work_id
    AND pew.archived_at IS NULL
    AND pew.deleted_at IS NULL;

  IF v_work IS NULL THEN
    RAISE EXCEPTION 'Работа не найдена' USING ERRCODE = 'P0002';
  END IF;

  SELECT dm.id, dm.code, dm.name, dm.unit_code, dm.unit_label,
         dm.price_amount, dm.category, dm.supplier_name, dm.version
  INTO v_source
  FROM public.directory_materials dm
  WHERE dm.workspace_owner_id = p_workspace_owner_id
    AND dm.id = p_directory_material_id
    AND dm.status = 'active'
    AND dm.deleted_at IS NULL;

  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Материал справочника не найден' USING ERRCODE = 'P0002';
  END IF;

  IF p_changed_field IN ('consumption', 'workQuantity') AND p_consumption IS NOT NULL THEN
    v_resolved_quantity = round((v_work.quantity / p_consumption)::numeric, 3);
    v_resolved_consumption = p_consumption;
  ELSIF p_changed_field = 'quantity' THEN
    v_resolved_quantity = round(COALESCE(p_quantity, 0)::numeric, 3);
    v_resolved_consumption = CASE
      WHEN COALESCE(p_quantity, 0) > 0
      THEN round((v_work.quantity / p_quantity)::numeric, 6)
      ELSE NULL
    END;
  ELSE
    v_resolved_quantity = round(COALESCE(p_quantity, 0)::numeric, 3);
    v_resolved_consumption = p_consumption;
  END IF;

  SELECT COALESCE(count(*), 0) + 1 INTO v_number
  FROM public.project_estimate_materials
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND work_id = p_work_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;

  SELECT COALESCE(max(sort_order), 0) + 1000 INTO v_sort_order
  FROM public.project_estimate_materials
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND work_id = p_work_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;

  INSERT INTO public.project_estimate_materials (
    workspace_owner_id, project_id, estimate_record_id, section_id, work_id,
    directory_material_id, directory_material_version, number, code, title,
    unit_code, unit_label, quantity, consumption, price, supplier_name,
    sort_order, created_by, updated_by
  ) VALUES (
    p_workspace_owner_id, p_project_id, p_estimate_record_id, v_work.section_id, v_work.id,
    v_source.id, v_source.version, v_number::text, v_source.code, v_source.name,
    v_source.unit_code, v_source.unit_label, v_resolved_quantity, v_resolved_consumption,
    COALESCE(p_price, v_source.price_amount), v_source.supplier_name,
    v_sort_order, p_created_by, p_created_by
  )
  RETURNING id INTO v_material_id;

  RETURN v_material_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_material_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_material_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, uuid, text) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. archive_estimate_section
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_estimate_section(
  p_workspace_owner_id uuid,
  p_project_id uuid,
  p_estimate_record_id uuid,
  p_section_id uuid,
  p_updated_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_section_exists boolean;
  v_now timestamptz := now();
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.project_estimate_sections
    WHERE workspace_owner_id = p_workspace_owner_id
      AND project_id = p_project_id
      AND estimate_record_id = p_estimate_record_id
      AND id = p_section_id
      AND archived_at IS NULL
      AND deleted_at IS NULL
  ) INTO v_section_exists;

  IF NOT v_section_exists THEN
    RAISE EXCEPTION 'Раздел не найден' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.project_estimate_materials
  SET archived_at = v_now, updated_by = p_updated_by
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND section_id = p_section_id
    AND archived_at IS NULL;

  UPDATE public.project_estimate_works
  SET archived_at = v_now, updated_by = p_updated_by
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND section_id = p_section_id
    AND archived_at IS NULL;

  UPDATE public.project_estimate_sections
  SET archived_at = v_now, updated_by = p_updated_by
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND id = p_section_id;

  PERFORM private.recalculate_project_estimate_record_amount(p_estimate_record_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_estimate_section(uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_estimate_section(uuid, uuid, uuid, uuid, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. archive_estimate_work
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_estimate_work(
  p_workspace_owner_id uuid,
  p_project_id uuid,
  p_estimate_record_id uuid,
  p_work_id uuid,
  p_updated_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_work record;
  v_now timestamptz := now();
BEGIN
  SELECT pew.id, pew.section_id
  INTO v_work
  FROM public.project_estimate_works pew
  WHERE pew.workspace_owner_id = p_workspace_owner_id
    AND pew.project_id = p_project_id
    AND pew.estimate_record_id = p_estimate_record_id
    AND pew.id = p_work_id
    AND pew.archived_at IS NULL
    AND pew.deleted_at IS NULL;

  IF v_work IS NULL THEN
    RAISE EXCEPTION 'Работа не найдена' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.project_estimate_materials
  SET archived_at = v_now, updated_by = p_updated_by
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND work_id = p_work_id
    AND archived_at IS NULL;

  UPDATE public.project_estimate_works
  SET archived_at = v_now, updated_by = p_updated_by
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND section_id = v_work.section_id
    AND id = p_work_id;

  PERFORM private.recalculate_project_estimate_section_totals(v_work.section_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_estimate_work(uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_estimate_work(uuid, uuid, uuid, uuid, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. archive_estimate_material
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_estimate_material(
  p_workspace_owner_id uuid,
  p_project_id uuid,
  p_estimate_record_id uuid,
  p_material_id uuid,
  p_updated_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_material_exists boolean;
  v_now timestamptz := now();
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.project_estimate_materials
    WHERE workspace_owner_id = p_workspace_owner_id
      AND project_id = p_project_id
      AND estimate_record_id = p_estimate_record_id
      AND id = p_material_id
      AND archived_at IS NULL
      AND deleted_at IS NULL
  ) INTO v_material_exists;

  IF NOT v_material_exists THEN
    RAISE EXCEPTION 'Материал не найден' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.project_estimate_materials
  SET archived_at = v_now, updated_by = p_updated_by
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND id = p_material_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_estimate_material(uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_estimate_material(uuid, uuid, uuid, uuid, uuid) TO authenticated, service_role;
