-- Migration: 051_project_estimate_works_fact
-- Description: Add fact_quantity and fact_price columns to project_estimate_works for plan-fact analysis
-- Date: 2026-05-25

ALTER TABLE public.project_estimate_works
  ADD COLUMN IF NOT EXISTS fact_quantity numeric(14, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fact_price numeric(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.project_estimate_works
  DROP CONSTRAINT IF EXISTS chk_project_estimate_works_fact_quantity_non_negative,
  DROP CONSTRAINT IF EXISTS chk_project_estimate_works_fact_price_non_negative;

ALTER TABLE public.project_estimate_works
  ADD CONSTRAINT chk_project_estimate_works_fact_quantity_non_negative CHECK (fact_quantity >= 0),
  ADD CONSTRAINT chk_project_estimate_works_fact_price_non_negative CHECK (fact_price >= 0);
