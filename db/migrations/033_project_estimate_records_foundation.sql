-- ============================================================================
-- Migration: 033_project_estimate_records_foundation
-- Description: First backend slice for the project estimate records list.
-- Scope: list records inside one project, create by name, rename by name.
-- Date: 2026-05-19
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.project_estimate_record_status AS ENUM ('new', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.project_estimate_record_normalize(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(lower(trim(coalesce(value, '')), '\s+', ' ', 'g');
$$;

CREATE OR REPLACE FUNCTION private.set_project_estimate_record_search_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.normalized_name = private.project_estimate_record_normalize(NEW.name);
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.project_estimate_records (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  name text NOT NULL,
  normalized_name text NOT NULL,
  type text NOT NULL DEFAULT 'Основная',
  status public.project_estimate_record_status NOT NULL DEFAULT 'new',
  amount numeric(14, 2) NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT uq_project_estimate_records_id_workspace UNIQUE (id, workspace_owner_id),
  CONSTRAINT fk_project_estimate_records_project_workspace FOREIGN KEY (project_id, workspace_owner_id)
    REFERENCES public.projects(id, workspace_owner_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_project_estimate_records_name_not_empty CHECK (btrim(name) <> ''),
  CONSTRAINT chk_project_estimate_records_type_not_empty CHECK (btrim(type) <> ''),
  CONSTRAINT chk_project_estimate_records_amount_non_negative CHECK (amount >= 0)
);

DROP TRIGGER IF EXISTS trg_project_estimate_records_search_fields ON public.project_estimate_records;
CREATE TRIGGER trg_project_estimate_records_search_fields
  BEFORE INSERT OR UPDATE OF name
  ON public.project_estimate_records
  FOR EACH ROW
  EXECUTE FUNCTION private.set_project_estimate_record_search_fields();

DROP TRIGGER IF EXISTS trg_project_estimate_records_updated_at ON public.project_estimate_records;
CREATE TRIGGER trg_project_estimate_records_updated_at
  BEFORE UPDATE ON public.project_estimate_records
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_project_estimate_records_project_active
  ON public.project_estimate_records(workspace_owner_id, project_id, archived_at, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_estimate_records_status
  ON public.project_estimate_records(workspace_owner_id, status);

ALTER TABLE public.project_estimate_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_estimate_records_select" ON public.project_estimate_records;
CREATE POLICY "project_estimate_records_select" ON public.project_estimate_records
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_records_insert" ON public.project_estimate_records;
CREATE POLICY "project_estimate_records_insert" ON public.project_estimate_records
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_records_update" ON public.project_estimate_records;
CREATE POLICY "project_estimate_records_update" ON public.project_estimate_records
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_records_delete" ON public.project_estimate_records;
CREATE POLICY "project_estimate_records_delete" ON public.project_estimate_records
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_estimate_records TO authenticated;

REVOKE EXECUTE ON FUNCTION private.project_estimate_record_normalize(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.project_estimate_record_normalize(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.set_project_estimate_record_search_fields() TO authenticated, service_role;