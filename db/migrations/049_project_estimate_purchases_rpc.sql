-- ============================================================================
-- Migration: 049_project_estimate_purchases_rpc
-- Description: RPC functions for CRUD operations on project_estimate_purchases.
--   SECURITY DEFINER with server-side workspace ownership validation.
--   Functions: add / update / archive.
-- Date: 2026-05-24
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. add_project_estimate_purchase
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_project_estimate_purchase(
  p_estimate_record_id uuid,
  p_workspace_owner_id uuid,
  p_directory_material_id uuid,
  p_estimate_material_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_quantity numeric DEFAULT 0,
  p_price numeric DEFAULT 0,
  p_supplier_name text DEFAULT NULL,
  p_purchase_date text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_purchase_id uuid;
  v_total numeric(14, 2);
  v_material record;
  v_result jsonb;
BEGIN
  -- Validate estimate record belongs to workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.project_estimate_records
    WHERE id = p_estimate_record_id
      AND workspace_owner_id = p_workspace_owner_id
      AND archived_at IS NULL
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Смета не найдена' USING ERRCODE = 'P0002';
  END IF;

  -- Resolve title and unit from directory if not provided
  IF p_directory_material_id IS NOT NULL THEN
    SELECT dm.name, dm.unit_label
    INTO v_material
    FROM public.directory_materials dm
    WHERE dm.id = p_directory_material_id
      AND dm.workspace_owner_id = p_workspace_owner_id
      AND dm.deleted_at IS NULL;

    IF v_material IS NULL THEN
      RAISE EXCEPTION 'Материал справочника не найден' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  v_total := round((p_quantity * p_price)::numeric, 2);

  INSERT INTO public.project_estimate_purchases (
    workspace_owner_id,
    estimate_record_id,
    directory_material_id,
    estimate_material_id,
    title,
    unit,
    quantity,
    price,
    total,
    supplier_name,
    purchase_date,
    notes,
    created_by,
    updated_by
  ) VALUES (
    p_workspace_owner_id,
    p_estimate_record_id,
    p_directory_material_id,
    p_estimate_material_id,
    COALESCE(p_title, v_material.name, ''),
    COALESCE(p_unit, v_material.unit_label, ''),
    p_quantity,
    p_price,
    v_total,
    p_supplier_name,
    p_purchase_date,
    p_notes,
    p_created_by,
    p_created_by
  )
  RETURNING id INTO v_purchase_id;

  -- Return the created row
  SELECT jsonb_build_object(
    'id', pep.id,
    'estimateRecordId', pep.estimate_record_id,
    'directoryMaterialId', pep.directory_material_id,
    'estimateMaterialId', pep.estimate_material_id,
    'title', pep.title,
    'unit', pep.unit,
    'quantity', pep.quantity,
    'price', pep.price,
    'total', pep.total,
    'supplierName', pep.supplier_name,
    'purchaseDate', pep.purchase_date,
    'notes', pep.notes,
    'createdAt', pep.created_at,
    'updatedAt', pep.updated_at
  ) INTO v_result
  FROM public.project_estimate_purchases pep
  WHERE pep.id = v_purchase_id;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_project_estimate_purchase(uuid, uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_project_estimate_purchase(uuid, uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. update_project_estimate_purchase
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_project_estimate_purchase(
  p_purchase_id uuid,
  p_workspace_owner_id uuid,
  p_quantity numeric DEFAULT NULL,
  p_price numeric DEFAULT NULL,
  p_supplier_name text DEFAULT NULL,
  p_purchase_date text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_updated_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_purchase record;
  v_result jsonb;
BEGIN
  -- Validate purchase exists and belongs to workspace
  SELECT *
  INTO v_purchase
  FROM public.project_estimate_purchases
  WHERE id = p_purchase_id
    AND workspace_owner_id = p_workspace_owner_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;

  IF v_purchase IS NULL THEN
    RAISE EXCEPTION 'Запись закупки не найдена' USING ERRCODE = 'P0002';
  END IF;

  -- Update with provided values, keeping existing where NULL
  UPDATE public.project_estimate_purchases
  SET
    quantity = COALESCE(p_quantity, quantity),
    price = COALESCE(p_price, price),
    total = CASE
      WHEN p_quantity IS NOT NULL OR p_price IS NOT NULL
      THEN round((COALESCE(p_quantity, quantity) * COALESCE(p_price, price))::numeric, 2)
      ELSE total
    END,
    supplier_name = COALESCE(p_supplier_name, supplier_name),
    purchase_date = COALESCE(p_purchase_date, purchase_date),
    notes = COALESCE(p_notes, notes),
    updated_by = p_updated_by,
    updated_at = now()
  WHERE id = p_purchase_id
    AND workspace_owner_id = p_workspace_owner_id;

  -- Return updated row
  SELECT jsonb_build_object(
    'id', pep.id,
    'estimateRecordId', pep.estimate_record_id,
    'directoryMaterialId', pep.directory_material_id,
    'estimateMaterialId', pep.estimate_material_id,
    'title', pep.title,
    'unit', pep.unit,
    'quantity', pep.quantity,
    'price', pep.price,
    'total', pep.total,
    'supplierName', pep.supplier_name,
    'purchaseDate', pep.purchase_date,
    'notes', pep.notes,
    'createdAt', pep.created_at,
    'updatedAt', pep.updated_at
  ) INTO v_result
  FROM public.project_estimate_purchases pep
  WHERE pep.id = p_purchase_id;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_project_estimate_purchase(uuid, uuid, numeric, numeric, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_project_estimate_purchase(uuid, uuid, numeric, numeric, text, text, text, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. archive_project_estimate_purchase
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_project_estimate_purchase(
  p_purchase_id uuid,
  p_workspace_owner_id uuid,
  p_updated_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_purchase_exists boolean;
  v_now timestamptz := now();
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.project_estimate_purchases
    WHERE id = p_purchase_id
      AND workspace_owner_id = p_workspace_owner_id
      AND archived_at IS NULL
      AND deleted_at IS NULL
  ) INTO v_purchase_exists;

  IF NOT v_purchase_exists THEN
    RAISE EXCEPTION 'Запись закупки не найдена' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.project_estimate_purchases
  SET archived_at = v_now, updated_by = p_updated_by
  WHERE id = p_purchase_id
    AND workspace_owner_id = p_workspace_owner_id;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_project_estimate_purchase(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_project_estimate_purchase(uuid, uuid, uuid) TO authenticated, service_role;
