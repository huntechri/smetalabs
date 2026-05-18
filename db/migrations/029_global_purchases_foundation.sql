-- ============================================================================
-- Migration: 029_global_purchases_foundation
-- Description: Workspace-scoped global purchases without temporary data.
-- Date: 2026-05-18
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

DO $$ BEGIN
  CREATE TYPE public.global_purchase_status AS ENUM (
    'planned',
    'ordered',
    'partially_received',
    'received',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.global_purchase_normalize(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(lower(trim(coalesce(value, ''))), '\s+', ' ', 'g');
$$;

CREATE OR REPLACE FUNCTION private.global_purchase_build_search_text(
  p_title text,
  p_unit text,
  p_supplier_name text,
  p_project_title text,
  p_notes text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT trim(concat_ws(' ', p_title, p_unit, p_supplier_name, p_project_title, p_notes));
$$;

CREATE OR REPLACE FUNCTION private.set_global_purchase_search_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.normalized_title = private.global_purchase_normalize(NEW.title);
  NEW.search_text = private.global_purchase_build_search_text(
    NEW.title,
    NEW.unit,
    NEW.supplier_name,
    NEW.project_title,
    NEW.notes
  );
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.global_purchases (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  normalized_title text NOT NULL,
  unit text NOT NULL,
  plan_quantity numeric(14, 3) NOT NULL,
  plan_price numeric(14, 2) NOT NULL,
  fact_quantity numeric(14, 3),
  fact_price numeric(14, 2),
  supplier_id uuid,
  supplier_name text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  project_title text,
  purchase_date text,
  status public.global_purchase_status NOT NULL DEFAULT 'planned',
  notes text,
  search_text text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT uq_global_purchases_id_workspace UNIQUE (id, workspace_owner_id),
  CONSTRAINT chk_global_purchases_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT chk_global_purchases_unit_not_empty CHECK (btrim(unit) <> ''),
  CONSTRAINT chk_global_purchases_plan_quantity_non_negative CHECK (plan_quantity >= 0),
  CONSTRAINT chk_global_purchases_plan_price_non_negative CHECK (plan_price >= 0),
  CONSTRAINT chk_global_purchases_fact_quantity_non_negative CHECK (fact_quantity IS NULL OR fact_quantity >= 0),
  CONSTRAINT chk_global_purchases_fact_price_non_negative CHECK (fact_price IS NULL OR fact_price >= 0)
);

DROP TRIGGER IF EXISTS trg_global_purchases_search_fields ON public.global_purchases;
CREATE TRIGGER trg_global_purchases_search_fields
  BEFORE INSERT OR UPDATE OF title, unit, supplier_name, project_title, notes
  ON public.global_purchases
  FOR EACH ROW
  EXECUTE FUNCTION private.set_global_purchase_search_fields();

DROP TRIGGER IF EXISTS trg_global_purchases_updated_at ON public.global_purchases;
CREATE TRIGGER trg_global_purchases_updated_at
  BEFORE UPDATE ON public.global_purchases
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_global_purchases_workspace_status_deleted
  ON public.global_purchases(workspace_owner_id, status, archived_at, deleted_at);

CREATE INDEX IF NOT EXISTS idx_global_purchases_workspace_project
  ON public.global_purchases(workspace_owner_id, project_id)
  WHERE project_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_global_purchases_workspace_title
  ON public.global_purchases(workspace_owner_id, normalized_title);

CREATE INDEX IF NOT EXISTS idx_global_purchases_workspace_updated_at
  ON public.global_purchases(workspace_owner_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_global_purchases_normalized_title_trgm
  ON public.global_purchases USING gin(normalized_title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_global_purchases_search_text_trgm
  ON public.global_purchases USING gin(search_text extensions.gin_trgm_ops);

ALTER TABLE public.global_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_purchases_select" ON public.global_purchases;
CREATE POLICY "global_purchases_select" ON public.global_purchases
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "global_purchases_insert" ON public.global_purchases;
CREATE POLICY "global_purchases_insert" ON public.global_purchases
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "global_purchases_update" ON public.global_purchases;
CREATE POLICY "global_purchases_update" ON public.global_purchases
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "global_purchases_delete" ON public.global_purchases;
CREATE POLICY "global_purchases_delete" ON public.global_purchases
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_purchases TO authenticated;

REVOKE EXECUTE ON FUNCTION private.global_purchase_normalize(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.global_purchase_build_search_text(text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.set_global_purchase_search_fields() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.global_purchase_normalize(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.global_purchase_build_search_text(text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.set_global_purchase_search_fields() TO authenticated, service_role;
