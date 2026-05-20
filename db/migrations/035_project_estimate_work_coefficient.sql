ALTER TABLE public.project_estimate_records
  ADD COLUMN IF NOT EXISTS works_coefficient_percent numeric(7, 3) NOT NULL DEFAULT 0;

ALTER TABLE public.project_estimate_works
  ADD COLUMN IF NOT EXISTS base_price numeric(14, 2);

UPDATE public.project_estimate_works
SET base_price = price
WHERE base_price IS NULL;

ALTER TABLE public.project_estimate_works
  ALTER COLUMN base_price SET DEFAULT 0,
  ALTER COLUMN base_price SET NOT NULL;

ALTER TABLE public.project_estimate_records
  DROP CONSTRAINT IF EXISTS chk_project_estimate_records_works_coefficient_percent_range;

ALTER TABLE public.project_estimate_records
  ADD CONSTRAINT chk_project_estimate_records_works_coefficient_percent_range
  CHECK (works_coefficient_percent >= 0 AND works_coefficient_percent <= 1000);

ALTER TABLE public.project_estimate_works
  DROP CONSTRAINT IF EXISTS chk_project_estimate_works_base_price_non_negative;

ALTER TABLE public.project_estimate_works
  ADD CONSTRAINT chk_project_estimate_works_base_price_non_negative
  CHECK (base_price >= 0);

CREATE OR REPLACE FUNCTION private.project_estimate_round_work_price_to_10(p_value numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_value <= 0 THEN 0::numeric
    ELSE (ceil(p_value / 10) * 10)::numeric(14, 2)
  END;
$$;

CREATE OR REPLACE FUNCTION private.project_estimate_price_with_work_coefficient(
  p_base_price numeric,
  p_coefficient_percent numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_coefficient_percent <= 0 THEN round(p_base_price, 2)
    ELSE private.project_estimate_round_work_price_to_10(
      p_base_price * (1 + (p_coefficient_percent / 100))
    )
  END;
$$;

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
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.price IS DISTINCT FROM OLD.price
      AND NEW.base_price IS NOT DISTINCT FROM OLD.base_price THEN
      NEW.base_price = NEW.price;
    END IF;

    IF NEW.base_price IS NULL OR NEW.base_price = 0 THEN
      NEW.base_price = NEW.price;
    END IF;
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
END;
$$;

DROP TRIGGER IF EXISTS trg_project_estimate_works_prepare_price ON public.project_estimate_works;
CREATE TRIGGER trg_project_estimate_works_prepare_price
  BEFORE INSERT OR UPDATE OF price, base_price ON public.project_estimate_works
  FOR EACH ROW
  EXECUTE FUNCTION private.project_estimate_work_prepare_price();
