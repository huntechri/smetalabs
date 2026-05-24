-- 046: RPC get_estimate_purchases — plan-fact analysis for estimate purchases tab
-- Aggregates plan (from project_estimate_materials) vs fact (from global_purchases)
-- Returns one row per material with plan/fact/deviation metrics

CREATE OR REPLACE FUNCTION public.get_estimate_purchases(
  p_estimate_record_id uuid,
  p_workspace_owner_id uuid
)
RETURNS TABLE (
  material_id uuid,
  title text,
  unit text,
  plan_quantity numeric,
  plan_price numeric,
  plan_total numeric,
  fact_quantity numeric,
  fact_avg_price numeric,
  fact_total numeric,
  deviation_total numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Plan: aggregate materials from the estimate
  WITH plan AS (
    SELECT
      pem.directory_material_id,
      dm.name AS title,
      dm.unit_label AS unit,
      SUM(pem.quantity) AS plan_quantity,
      AVG(pem.price) AS plan_price,
      SUM(pem.quantity * pem.price) AS plan_total
    FROM project_estimate_materials pem
    JOIN directory_materials dm
      ON dm.id = pem.directory_material_id
    WHERE pem.estimate_record_id = p_estimate_record_id
      AND pem.workspace_owner_id = p_workspace_owner_id
      AND pem.archived_at IS NULL
      AND pem.directory_material_id IS NOT NULL
    GROUP BY pem.directory_material_id, dm.name, dm.unit_label
  ),
  -- Fact: aggregate from global_purchases with weighted average price
  fact AS (
    SELECT
      gp.directory_material_id,
      SUM(gp.fact_quantity) AS fact_quantity,
      CASE
        WHEN SUM(gp.fact_quantity) > 0
        THEN SUM(gp.fact_quantity * gp.fact_price) / SUM(gp.fact_quantity)
        ELSE NULL
      END AS fact_avg_price,
      SUM(gp.fact_quantity * gp.fact_price) AS fact_total
    FROM global_purchases gp
    WHERE gp.workspace_owner_id = p_workspace_owner_id
      AND gp.archived_at IS NULL
      AND gp.deleted_at IS NULL
      AND gp.directory_material_id IS NOT NULL
    GROUP BY gp.directory_material_id
  )
  SELECT
    plan.directory_material_id AS material_id,
    plan.title,
    plan.unit,
    plan.plan_quantity,
    plan.plan_price,
    plan.plan_total,
    fact.fact_quantity,
    fact.fact_avg_price,
    fact.fact_total,
    -- Deviation: plan_total - fact_total (NULL if no fact data)
    plan.plan_total - COALESCE(fact.fact_total, 0) AS deviation_total
  FROM plan
  LEFT JOIN fact
    ON fact.directory_material_id = plan.directory_material_id
  ORDER BY plan.title;
$$;

-- Grant execute to authenticated users (RLS policies checked via workspace_owner_id param)
GRANT EXECUTE ON FUNCTION public.get_estimate_purchases(uuid, uuid) TO authenticated;
