CREATE OR REPLACE FUNCTION public.apply_project_estimate_work_coefficient(
  p_workspace_owner_id uuid,
  p_project_id uuid,
  p_estimate_record_id uuid,
  p_coefficient_percent numeric,
  p_updated_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_record_id uuid;
BEGIN
  IF p_coefficient_percent < 0 OR p_coefficient_percent > 1000 THEN
    RAISE EXCEPTION 'PROJECT_ESTIMATE_WORK_COEFFICIENT_OUT_OF_RANGE'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.project_estimate_records record
  SET works_coefficient_percent = p_coefficient_percent,
      updated_by = p_updated_by,
      updated_at = now()
  WHERE record.workspace_owner_id = p_workspace_owner_id
    AND record.project_id = p_project_id
    AND record.id = p_estimate_record_id
    AND record.archived_at IS NULL
    AND record.deleted_at IS NULL
  RETURNING record.id INTO target_record_id;

  IF target_record_id IS NULL THEN
    RAISE EXCEPTION 'PROJECT_ESTIMATE_RECORD_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.project_estimate_works work
  SET base_price = work.base_price,
      price = work.base_price,
      updated_by = p_updated_by
  WHERE work.workspace_owner_id = p_workspace_owner_id
    AND work.project_id = p_project_id
    AND work.estimate_record_id = p_estimate_record_id
    AND work.archived_at IS NULL
    AND work.deleted_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_project_estimate_work_coefficient(uuid, uuid, uuid, numeric, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_project_estimate_work_coefficient(uuid, uuid, uuid, numeric, uuid)
  TO service_role;