-- ============================================================================
-- Migration: 037_optimize_estimate_editor_performance
-- Description: Performance optimizations for estimate editor trigger cascade.
--   Opt 2: Batch material quantity recalculation RPC (eliminates N+1)
--   Opt 3: Remove duplicate recalculate_record_amount from section totals
--   Opt 4: Combine 4 subqueries into 2 in section totals
--   Opt 5: Skip unnecessary coefficient SELECT in prepare_price
-- Date: 2026-05-21
-- ============================================================================

-- Opt 2: Single SQL call to recalculate all materials for a work
-- Replaces N sequential UPDATE calls in JavaScript
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
  SET quantity = round(p_work_quantity / consumption, 3),
      updated_by = p_updated_by,
      updated_at = now()
  WHERE workspace_owner_id = p_workspace_owner_id
    AND project_id = p_project_id
    AND estimate_record_id = p_estimate_record_id
    AND work_id = p_work_id
    AND archived_at IS NULL
    AND deleted_at IS NULL
    AND consumption IS NOT NULL
    AND consumption > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_materials_by_work_quantity(uuid, uuid, uuid, uuid, numeric, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_materials_by_work_quantity(uuid, uuid, uuid, uuid, numeric, uuid)
  TO service_role, authenticated;

-- Opt 3+4: Optimize recalculate_project_estimate_section_totals
-- - Replace 4 subqueries (works_amount, materials_amount, and two SUM for total)
--   with 2 subqueries + local arithmetic (Opt 4)
-- - Remove explicit recalculate_record_amount call; rely on section AFTER trigger
--   which fires on the UPDATE above, giving exactly one recalculation (Opt 3)
CREATE OR REPLACE FUNCTION private.recalculate_project_estimate_section_totals(p_section_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_works_amount numeric(14, 2);
  v_materials_amount numeric(14, 2);
BEGIN
  SELECT COALESCE(sum(total_amount), 0)
  INTO v_works_amount
  FROM public.project_estimate_works
  WHERE section_id = p_section_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;

  SELECT COALESCE(sum(total_amount), 0)
  INTO v_materials_amount
  FROM public.project_estimate_materials
  WHERE section_id = p_section_id
    AND archived_at IS NULL
    AND deleted_at IS NULL;

  UPDATE public.project_estimate_sections
  SET works_amount = v_works_amount,
      materials_amount = v_materials_amount,
      total_amount = v_works_amount + v_materials_amount,
      updated_at = now()
  WHERE id = p_section_id;

  -- recalculate_record_amount is NOT called here anymore.
  -- The section AFTER trigger (project_estimate_section_after_change)
  -- fires on the UPDATE above and handles it, avoiding a double call.
END;
$$;

-- Opt 5: Optimize prepare_price trigger
-- Skip SELECT from project_estimate_records when estimate_record
-- hasn't changed AND old values can be used to infer the coefficient.
-- Trigger fires on price/base_price changes only (not quantity),
-- so most quantity-only updates already skip this trigger entirely.
CREATE OR REPLACE FUNCTION private.project_estimate_work_prepare_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target_coefficient numeric(7, 3);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.base_price IS NULL OR NEW.base_price = 0 THEN
      NEW.base_price = NEW.price;
    END IF;

    SELECT COALESCE(record.works_coefficient_percent, 0)
    INTO target_coefficient
    FROM public.project_estimate_records record
    WHERE record.id = NEW.estimate_record_id
      AND record.workspace_owner_id = NEW.workspace_owner_id
      AND record.project_id = NEW.project_id;

    NEW.price = private.project_estimate_price_with_work_coefficient(
      NEW.base_price,
      COALESCE(target_coefficient, 0)
    );
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE'
  IF NEW.base_price IS NULL OR NEW.base_price = 0 THEN
    NEW.base_price = NEW.price;
  END IF;

  IF NEW.price IS DISTINCT FROM OLD.price
    AND NEW.base_price IS NOT DISTINCT FROM OLD.base_price THEN
    NEW.base_price = NEW.price;
  END IF;

  -- Optimization: if estimate_record_id unchanged, coefficient is the same.
  -- Derive coefficient ratio from OLD values instead of a DB round-trip.
  -- The rounding to 10 in price_with_work_coefficient absorbs minor
  -- imprecision from floating-point division.
  IF NEW.estimate_record_id IS NOT DISTINCT FROM OLD.estimate_record_id
     AND OLD.base_price > 0 THEN
    NEW.price = private.project_estimate_price_with_work_coefficient(
      NEW.base_price,
      ((OLD.price::numeric / OLD.base_price::numeric) - 1) * 100
    );
    RETURN NEW;
  END IF;

  -- estimate_record changed (work moved between records): fetch coefficient
  SELECT COALESCE(record.works_coefficient_percent, 0)
  INTO target_coefficient
  FROM public.project_estimate_records record
  WHERE record.id = NEW.estimate_record_id
    AND record.workspace_owner_id = NEW.workspace_owner_id
    AND record.project_id = NEW.project_id;

  NEW.price = private.project_estimate_price_with_work_coefficient(
    NEW.base_price,
    COALESCE(target_coefficient, 0)
  );

  RETURN NEW;
END;
$$;
