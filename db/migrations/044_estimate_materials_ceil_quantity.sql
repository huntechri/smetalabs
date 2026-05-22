-- ============================================================================
-- Migration: 044_estimate_materials_ceil_quantity
-- Description: Update material calculations to always round quantity upward
--   Quantity = CEIL(Work Quantity * Consumption)
--   Consumption = Quantity / Work Quantity (calculated using the rounded quantity)
-- Date: 2026-05-22
-- ============================================================================

-- 1. Update recalculate_materials_by_work_quantity to ceil(p_work_quantity * consumption)
CREATE OR REPLACE FUNCTION public.recalculate_materials_by_work_quantity(
  p_workspace_owner_id uuid,
  p_project_id uuid,
  p_estimate_record_id uuid,
  p_work_id uuid,
  p_work_quantity numeric,
  p_updated_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.project_estimate_materials
  SET quantity = ceil(p_work_quantity * consumption),
      updated_by = p_updated_by,
      updated_at = now()
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND work_id = p_work_id
    AND archived_at IS NULL
    AND deleted_at IS NULL
    AND consumption IS NOT NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_materials_by_work_quantity(uuid, uuid, uuid, uuid, numeric, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_materials_by_work_quantity(uuid, uuid, uuid, uuid, numeric, uuid)
  TO service_role, authenticated;

-- 2. Update add_material_from_directory_to_estimate to ceil quantity and calculate consumption accordingly
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
    v_resolved_quantity = ceil(v_work.quantity * p_consumption);
    v_resolved_consumption = p_consumption;
  ELSIF p_changed_field = 'quantity' THEN
    v_resolved_quantity = ceil(COALESCE(p_quantity, 0)::numeric);
    v_resolved_consumption = CASE
      WHEN v_work.quantity > 0
      THEN round((v_resolved_quantity / v_work.quantity)::numeric, 6)
      ELSE NULL
    END;
  ELSE
    v_resolved_quantity = ceil(COALESCE(p_quantity, 0)::numeric);
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
  ON CONFLICT (estimate_record_id, directory_material_id)
    WHERE archived_at IS NULL AND directory_material_id IS NOT NULL
    DO NOTHING
  RETURNING id INTO v_material_id;

  IF v_material_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM private.recalculate_project_estimate_section_totals(v_work.section_id);

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
          'sortOrder', w.sort_order,
          'materialsAmount', w.materials_amount,
          'totalWithMaterialsAmount', w.total_with_materials_amount,
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
              'sortOrder', m.sort_order,
              'directoryMaterialId', m.directory_material_id,
              'imageUrl', dm.image_url
            ) ORDER BY m.sort_order, m.id)
            FROM public.project_estimate_materials m
            LEFT JOIN public.directory_materials dm ON m.directory_material_id = dm.id
            WHERE m.work_id = w.id
              AND m.archived_at IS NULL
              AND m.deleted_at IS NULL
          ), '[]'::jsonb)
        ) ORDER BY w.sort_order, w.id)
        FROM public.project_estimate_works w
        WHERE w.section_id = v_work.section_id
          AND w.archived_at IS NULL
          AND w.deleted_at IS NULL
      ), '[]'::jsonb)
    )
    FROM public.project_estimate_sections s
    WHERE s.id = v_work.section_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_material_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_material_from_directory_to_estimate(uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, uuid, text) TO authenticated, service_role;
