-- ============================================================================
-- Migration: 041_fix_rpc_on_conflict_do_nothing
-- Description: Fix add_work_from_directory_to_estimate and
--   add_material_from_directory_to_estimate to return NULL on duplicate
--   instead of throwing an exception. Uses ON CONFLICT with partial unique
--   index predicate for DO NOTHING.
-- Date: 2026-05-21
-- ============================================================================

-- Drop old versions first
DROP FUNCTION IF EXISTS public.add_work_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, uuid);
DROP FUNCTION IF EXISTS public.add_material_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, uuid, text);

-- ----------------------------------------------------------------------------
-- 1. add_work_from_directory_to_estimate (updated: ON CONFLICT DO NOTHING)
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
RETURNS jsonb
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
  ON CONFLICT (estimate_record_id, directory_work_id)
    WHERE archived_at IS NULL AND directory_work_id IS NOT NULL
    DO NOTHING
  RETURNING id INTO v_work_id;

  -- Duplicate → return NULL (caller signals _duplicate)
  IF v_work_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'section', jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'number', s.number,
        'sortOrder', s.sort_order,
        'worksAmount', s.works_amount,
        'materialsAmount', s.materials_amount,
        'totalAmount', s.total_amount
      ),
      'works', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', w.id,
          'sectionId', w.section_id,
          'number', w.number,
          'code', w.code,
          'title', w.title,
          'unitCode', w.unit_code,
          'unitLabel', w.unit_label,
          'quantity', w.quantity,
          'price', w.price,
          'totalAmount', w.total_amount,
          'category', w.category,
          'notes', w.notes,
          'sortOrder', w.sort_order
        ) ORDER BY w.sort_order, w.id)
        FROM public.project_estimate_works w
        WHERE w.section_id = s.id
          AND w.archived_at IS NULL
          AND w.deleted_at IS NULL
      ), '[]'::jsonb),
      'materials', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', m.id,
          'workId', m.work_id,
          'sectionId', m.section_id,
          'number', m.number,
          'code', m.code,
          'title', m.title,
          'unitCode', m.unit_code,
          'unitLabel', m.unit_label,
          'quantity', m.quantity,
          'consumption', m.consumption,
          'price', m.price,
          'totalAmount', m.total_amount,
          'supplierName', m.supplier_name,
          'notes', m.notes,
          'sortOrder', m.sort_order
        ) ORDER BY m.sort_order, m.id)
        FROM public.project_estimate_materials m
        WHERE m.section_id = s.id
          AND m.archived_at IS NULL
          AND m.deleted_at IS NULL
      ), '[]'::jsonb),
      'record', jsonb_build_object(
        'id', r.id,
        'projectId', r.project_id,
        'name', r.name,
        'type', r.type,
        'status', r.status,
        'amount', r.amount
      )
    )
    FROM public.project_estimate_sections s
    JOIN public.project_estimate_records r ON r.id = s.estimate_record_id
    WHERE s.id = p_section_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_work_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_work_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. add_material_from_directory_to_estimate (updated: ON CONFLICT DO NOTHING)
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
RETURNS jsonb
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
  ON CONFLICT (work_id, directory_material_id)
    WHERE archived_at IS NULL AND directory_material_id IS NOT NULL
    DO NOTHING
  RETURNING id INTO v_material_id;

  -- Duplicate → return NULL (caller signals _duplicate)
  IF v_material_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'section', jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'number', s.number,
        'sortOrder', s.sort_order,
        'worksAmount', s.works_amount,
        'materialsAmount', s.materials_amount,
        'totalAmount', s.total_amount
      ),
      'works', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', w.id,
          'sectionId', w.section_id,
          'number', w.number,
          'code', w.code,
          'title', w.title,
          'unitCode', w.unit_code,
          'unitLabel', w.unit_label,
          'quantity', w.quantity,
          'price', w.price,
          'totalAmount', w.total_amount,
          'category', w.category,
          'notes', w.notes,
          'sortOrder', w.sort_order
        ) ORDER BY w.sort_order, w.id)
        FROM public.project_estimate_works w
        WHERE w.section_id = s.id
          AND w.archived_at IS NULL
          AND w.deleted_at IS NULL
      ), '[]'::jsonb),
      'materials', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', m.id,
          'workId', m.work_id,
          'sectionId', m.section_id,
          'number', m.number,
          'code', m.code,
          'title', m.title,
          'unitCode', m.unit_code,
          'unitLabel', m.unit_label,
          'quantity', m.quantity,
          'consumption', m.consumption,
          'price', m.price,
          'totalAmount', m.total_amount,
          'supplierName', m.supplier_name,
          'notes', m.notes,
          'sortOrder', m.sort_order
        ) ORDER BY m.sort_order, m.id)
        FROM public.project_estimate_materials m
        WHERE m.section_id = s.id
          AND m.archived_at IS NULL
          AND m.deleted_at IS NULL
      ), '[]'::jsonb),
      'record', jsonb_build_object(
        'id', r.id,
        'projectId', r.project_id,
        'name', r.name,
        'type', r.type,
        'status', r.status,
        'amount', r.amount
      )
    )
    FROM public.project_estimate_sections s
    JOIN public.project_estimate_records r ON r.id = s.estimate_record_id
    WHERE s.id = v_work.section_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_material_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_material_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, uuid, text) TO authenticated, service_role;
