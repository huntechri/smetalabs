CREATE OR REPLACE FUNCTION public.get_estimate_purchases_with_sources(
  p_estimate_record_id uuid,
  p_workspace_owner_id uuid,
  p_current_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  purchase_id uuid,
  material_id uuid,
  estimate_material_id uuid,
  directory_material_id uuid,
  title text,
  unit text,
  plan_quantity numeric,
  plan_price numeric,
  plan_total numeric,
  fact_quantity numeric,
  fact_avg_price numeric,
  fact_total numeric,
  deviation_total numeric,
  source text,
  editable boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH target_record AS (
    SELECT r.id, r.project_id
    FROM public.project_estimate_records r
    WHERE r.id = p_estimate_record_id
      AND r.workspace_owner_id = p_workspace_owner_id
      AND r.archived_at IS NULL
      AND r.deleted_at IS NULL
      AND (
        (
          auth.role() = 'service_role'
          AND p_current_user_id IS NOT NULL
          AND (
            p_current_user_id = r.workspace_owner_id
            OR EXISTS (
              SELECT 1
              FROM public.workspace_members wm
              WHERE wm.owner_id = r.workspace_owner_id
                AND wm.user_id = p_current_user_id
                AND wm.status = 'active'
            )
          )
        )
        OR (
          (SELECT auth.uid()) IS NOT NULL
          AND p_current_user_id = (SELECT auth.uid())
          AND (
            p_current_user_id = r.workspace_owner_id
            OR EXISTS (
              SELECT 1
              FROM public.workspace_members wm
              WHERE wm.owner_id = r.workspace_owner_id
                AND wm.user_id = p_current_user_id
                AND wm.status = 'active'
            )
          )
        )
      )
  ),
  plan AS (
    SELECT
      pem.directory_material_id,
      CASE
        WHEN COUNT(DISTINCT pem.section_id) = 1 THEN (array_agg(pem.id ORDER BY pem.sort_order, pem.id::text))[1]
        ELSE NULL::uuid
      END AS estimate_material_id,
      MIN(pem.title) AS title,
      MIN(pem.unit_label) AS unit,
      SUM(pem.quantity) AS plan_quantity,
      CASE
        WHEN SUM(pem.quantity) > 0 THEN SUM(pem.quantity * pem.price) / SUM(pem.quantity)
        ELSE AVG(pem.price)
      END AS plan_price,
      SUM(pem.quantity * pem.price) AS plan_total
    FROM public.project_estimate_materials pem
    JOIN target_record tr ON tr.id = pem.estimate_record_id
    WHERE pem.workspace_owner_id = p_workspace_owner_id
      AND pem.archived_at IS NULL
      AND pem.deleted_at IS NULL
      AND pem.directory_material_id IS NOT NULL
    GROUP BY pem.directory_material_id
  ),
  estimate_fact AS (
    SELECT
      pep.directory_material_id,
      COUNT(*) AS purchase_count,
      (array_agg(pep.id ORDER BY pep.created_at, pep.id::text))[1] AS purchase_id,
      MIN(pep.title) AS title,
      MIN(pep.unit) AS unit,
      SUM(pep.quantity) AS quantity,
      SUM(pep.total) AS total
    FROM public.project_estimate_purchases pep
    WHERE pep.estimate_record_id = p_estimate_record_id
      AND pep.workspace_owner_id = p_workspace_owner_id
      AND pep.archived_at IS NULL
      AND pep.deleted_at IS NULL
      AND pep.directory_material_id IS NOT NULL
    GROUP BY pep.directory_material_id
  ),
  global_fact AS (
    SELECT
      gp.directory_material_id,
      MIN(gp.title) AS title,
      MIN(gp.unit) AS unit,
      SUM(COALESCE(gp.fact_quantity, 0)) AS quantity,
      SUM(COALESCE(gp.fact_quantity, 0) * COALESCE(gp.fact_price, 0)) AS total
    FROM public.global_purchases gp
    JOIN target_record tr ON tr.project_id = gp.project_id
    WHERE gp.workspace_owner_id = p_workspace_owner_id
      AND gp.archived_at IS NULL
      AND gp.deleted_at IS NULL
      AND gp.status <> 'cancelled'
      AND gp.directory_material_id IS NOT NULL
      AND COALESCE(gp.fact_quantity, 0) > 0
    GROUP BY gp.directory_material_id
  ),
  fact AS (
    SELECT
      COALESCE(ef.directory_material_id, gf.directory_material_id) AS directory_material_id,
      CASE WHEN ef.purchase_count = 1 THEN ef.purchase_id ELSE NULL::uuid END AS purchase_id,
      COALESCE(ef.title, gf.title) AS title,
      COALESCE(ef.unit, gf.unit) AS unit,
      COALESCE(ef.quantity, 0) + COALESCE(gf.quantity, 0) AS fact_quantity,
      CASE
        WHEN COALESCE(ef.quantity, 0) + COALESCE(gf.quantity, 0) > 0 THEN
          (COALESCE(ef.total, 0) + COALESCE(gf.total, 0)) / (COALESCE(ef.quantity, 0) + COALESCE(gf.quantity, 0))
        ELSE NULL
      END AS fact_avg_price,
      COALESCE(ef.total, 0) + COALESCE(gf.total, 0) AS fact_total,
      CASE
        WHEN ef.directory_material_id IS NOT NULL AND gf.directory_material_id IS NOT NULL THEN 'mixed'
        WHEN ef.directory_material_id IS NOT NULL THEN 'estimate'
        WHEN gf.directory_material_id IS NOT NULL THEN 'global'
        ELSE NULL
      END AS source,
      CASE
        WHEN ef.purchase_count = 1 AND gf.directory_material_id IS NULL THEN true
        ELSE false
      END AS editable
    FROM estimate_fact ef
    FULL OUTER JOIN global_fact gf ON ef.directory_material_id = gf.directory_material_id
  )
  SELECT
    fact.purchase_id,
    COALESCE(plan.directory_material_id, fact.directory_material_id) AS material_id,
    plan.estimate_material_id,
    COALESCE(plan.directory_material_id, fact.directory_material_id) AS directory_material_id,
    COALESCE(plan.title, fact.title, 'Без названия') AS title,
    COALESCE(plan.unit, fact.unit, '') AS unit,
    COALESCE(plan.plan_quantity, 0) AS plan_quantity,
    COALESCE(plan.plan_price, 0) AS plan_price,
    COALESCE(plan.plan_total, 0) AS plan_total,
    fact.fact_quantity,
    fact.fact_avg_price,
    fact.fact_total,
    COALESCE(plan.plan_total, 0) - COALESCE(fact.fact_total, 0) AS deviation_total,
    fact.source,
    COALESCE(fact.editable, false) AS editable
  FROM plan
  FULL OUTER JOIN fact ON plan.directory_material_id = fact.directory_material_id
  ORDER BY title;
$$;

REVOKE EXECUTE ON FUNCTION public.get_estimate_purchases_with_sources(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_estimate_purchases_with_sources(uuid, uuid, uuid) TO authenticated, service_role;
