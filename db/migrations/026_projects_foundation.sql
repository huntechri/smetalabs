-- ============================================================================
-- Migration: 026_projects_foundation
-- Description: DB foundation for workspace-scoped projects list.
-- Date: 2026-05-17
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('new', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.project_normalize(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(lower(trim(coalesce(value, ''))), '\s+', ' ', 'g');
$$;

CREATE OR REPLACE FUNCTION private.project_build_search_text(
  p_title text,
  p_customer_name text,
  p_address text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT trim(concat_ws(' ', p_title, p_customer_name, p_address));
$$;

CREATE OR REPLACE FUNCTION private.set_project_search_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.normalized_title = private.project_normalize(NEW.title);
  NEW.search_text = private.project_build_search_text(
    NEW.title,
    NEW.customer_name,
    NEW.address
  );
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  normalized_title text NOT NULL,
  customer_name text,
  address text,
  budget_amount numeric(14, 2),
  start_date text,
  end_date text,
  status public.project_status NOT NULL DEFAULT 'new',
  progress integer NOT NULL DEFAULT 0,
  search_text text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT uq_projects_id_workspace UNIQUE (id, workspace_owner_id),
  CONSTRAINT chk_projects_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT chk_projects_progress_range CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT chk_projects_budget_non_negative CHECK (budget_amount IS NULL OR budget_amount >= 0)
);

DROP TRIGGER IF EXISTS trg_projects_search_fields ON public.projects;
CREATE TRIGGER trg_projects_search_fields
  BEFORE INSERT OR UPDATE OF title, customer_name, address
  ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION private.set_project_search_fields();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_projects_workspace_status_deleted
  ON public.projects(workspace_owner_id, status, archived_at, deleted_at);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_normalized_title
  ON public.projects(workspace_owner_id, normalized_title);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_updated_at
  ON public.projects(workspace_owner_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_projects_normalized_title_trgm
  ON public.projects USING gin(normalized_title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_projects_search_text_trgm
  ON public.projects USING gin(search_text extensions.gin_trgm_ops);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

REVOKE EXECUTE ON FUNCTION private.project_normalize(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.project_build_search_text(text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.project_normalize(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.project_build_search_text(text, text, text) TO authenticated;
