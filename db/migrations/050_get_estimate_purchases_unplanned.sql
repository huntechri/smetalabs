-- ============================================================================
-- Migration: 050_get_estimate_purchases_unplanned
-- Description: Update get_estimate_purchases RPC to support unplanned purchases
--   using a FULL OUTER JOIN between plan and fact. Also aggregates facts from
--   both project_estimate_purchases (estimate level) and global_purchases (project level).
-- Date: 2026-05-25
-- ============================================================================

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
  -- Fact: combine both estimate-level project_estimate_purchases and project-level global_purchases
  fact_raw AS (
    -- 1. Purchases recorded directly for this estimate
    SELECT
      pep.directory_material_id,
      pep.title,
      pep.unit,
      pep.quantity,
      pep.price,
      pep.total
    FROM project_estimate_purchases pep
    WHERE pep.estimate_record_id = p_estimate_record_id
      AND pep.workspace_owner_id = p_workspace_owner_id
      AND pep.archived_at IS NULL
      AND pep.deleted_at IS NULL

    UNION ALL

    -- 2. Global purchases linked to the project of this estimate
    SELECT
      gp.directory_material_id,
      gp.title,
      gp.unit,
      COALESCE(gp.fact_quantity, 0) AS quantity,
      COALESCE(gp.fact_price, 0) AS price,
      (COALESCE(gp.fact_quantity, 0) * COALESCE(gp.fact_price, 0)) AS total
    FROM global_purchases gp
    WHERE gp.project_id = (
        SELECT r.project_id 
        FROM project_estimate_records r 
        WHERE r.id = p_estimate_record_id
      )
      AND gp.workspace_owner_id = p_workspace_owner_id
      AND gp.archived_at IS NULL
      AND gp.deleted_at IS NULL
      AND COALESCE(gp.fact_quantity, 0) > 0
  ),
  fact AS (
    SELECT
      fr.directory_material_id,
      fr.title,
      fr.unit,
      SUM(fr.quantity) AS fact_quantity,
      CASE
        WHEN SUM(fr.quantity) > 0
        THEN SUM(fr.quantity * fr.price) / SUM(fr.quantity)
        ELSE NULL
      END AS fact_avg_price,
      SUM(fr.total) AS fact_total
    FROM fact_raw fr
    GROUP BY fr.directory_material_id, fr.title, fr.unit
  )
  SELECT
    COALESCE(plan.directory_material_id, fact.directory_material_id) AS material_id,
    COALESCE(plan.title, fact.title) AS title,
    COALESCE(plan.unit, fact.unit) AS unit,
    COALESCE(plan.plan_quantity, 0) AS plan_quantity,
    COALESCE(plan.plan_price, 0) AS plan_price,
    COALESCE(plan.plan_total, 0) AS plan_total,
    fact.fact_quantity,
    fact.fact_avg_price,
    fact.fact_total,
    -- Deviation: plan_total - fact_total
    COALESCE(plan.plan_total, 0) - COALESCE(fact.fact_total, 0) AS deviation_total
  FROM plan
  FULL OUTER JOIN fact
    ON plan.directory_material_id = fact.directory_material_id
  ORDER BY title;
$$;

-- Re-grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_estimate_purchases(uuid, uuid) TO authenticated;
