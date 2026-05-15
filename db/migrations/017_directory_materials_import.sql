-- ============================================================================
-- Migration: 017_directory_materials_import
-- Description: Staged CSV import storage for workspace-scoped directory materials.
-- Date: 2026-05-15
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE directory_material_import_job_status AS ENUM (
    'draft',
    'uploaded',
    'parsing',
    'parsed',
    'validating',
    'validated',
    'ready_for_review',
    'applying',
    'completed',
    'failed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE directory_material_import_row_status AS ENUM (
    'pending',
    'valid',
    'warning',
    'error',
    'duplicate',
    'conflict',
    'applied',
    'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE directory_material_import_row_action AS ENUM (
    'create',
    'update',
    'skip'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.directory_material_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status directory_material_import_job_status NOT NULL DEFAULT 'draft',
  source_name text,
  file_name text,
  file_mime_type text,
  file_size_bytes bigint,
  total_rows integer NOT NULL DEFAULT 0,
  parsed_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  warning_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  conflict_rows integer NOT NULL DEFAULT 0,
  applied_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_directory_material_import_jobs_counts_non_negative CHECK (
    total_rows >= 0 AND
    parsed_rows >= 0 AND
    valid_rows >= 0 AND
    warning_rows >= 0 AND
    error_rows >= 0 AND
    duplicate_rows >= 0 AND
    conflict_rows >= 0 AND
    applied_rows >= 0 AND
    skipped_rows >= 0
  ),
  CONSTRAINT chk_directory_material_import_jobs_file_size_non_negative CHECK (
    file_size_bytes IS NULL OR file_size_bytes >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.directory_material_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.directory_material_import_jobs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status directory_material_import_row_status NOT NULL DEFAULT 'pending',
  action directory_material_import_row_action,
  error_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  warning_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  duplicate_material_id uuid,
  conflict_material_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  dedupe_fingerprint text,
  applied_material_id uuid,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_directory_material_import_rows_job_row UNIQUE (workspace_owner_id, job_id, row_number),
  CONSTRAINT chk_directory_material_import_rows_row_number_positive CHECK (row_number > 0),
  CONSTRAINT chk_directory_material_import_rows_error_messages_array CHECK (jsonb_typeof(error_messages) = 'array'),
  CONSTRAINT chk_directory_material_import_rows_warning_messages_array CHECK (jsonb_typeof(warning_messages) = 'array'),
  CONSTRAINT fk_directory_material_import_rows_job_workspace FOREIGN KEY (job_id, workspace_owner_id)
    REFERENCES public.directory_material_import_jobs(id, workspace_owner_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_directory_material_import_rows_duplicate_material_workspace FOREIGN KEY (duplicate_material_id, workspace_owner_id)
    REFERENCES public.directory_materials(id, workspace_owner_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_directory_material_import_rows_applied_material_workspace FOREIGN KEY (applied_material_id, workspace_owner_id)
    REFERENCES public.directory_materials(id, workspace_owner_id)
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_directory_material_import_jobs_id_workspace
  ON public.directory_material_import_jobs(id, workspace_owner_id);

CREATE INDEX IF NOT EXISTS idx_directory_material_import_jobs_workspace_status_created
  ON public.directory_material_import_jobs(workspace_owner_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_directory_material_import_rows_workspace_job_status
  ON public.directory_material_import_rows(workspace_owner_id, job_id, status);

CREATE INDEX IF NOT EXISTS idx_directory_material_import_rows_workspace_dedupe
  ON public.directory_material_import_rows(workspace_owner_id, dedupe_fingerprint)
  WHERE dedupe_fingerprint IS NOT NULL;

DROP TRIGGER IF EXISTS trg_directory_material_import_jobs_updated_at ON public.directory_material_import_jobs;
CREATE TRIGGER trg_directory_material_import_jobs_updated_at
BEFORE UPDATE ON public.directory_material_import_jobs
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_directory_material_import_rows_updated_at ON public.directory_material_import_rows;
CREATE TRIGGER trg_directory_material_import_rows_updated_at
BEFORE UPDATE ON public.directory_material_import_rows
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.directory_material_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_material_import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "directory material import jobs read" ON public.directory_material_import_jobs;
CREATE POLICY "directory material import jobs read"
ON public.directory_material_import_jobs
FOR SELECT
TO authenticated
USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "directory material import jobs write" ON public.directory_material_import_jobs;
CREATE POLICY "directory material import jobs write"
ON public.directory_material_import_jobs
FOR ALL
TO authenticated
USING (private.workspace_can_write_directory(workspace_owner_id))
WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory material import rows read" ON public.directory_material_import_rows;
CREATE POLICY "directory material import rows read"
ON public.directory_material_import_rows
FOR SELECT
TO authenticated
USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "directory material import rows write" ON public.directory_material_import_rows;
CREATE POLICY "directory material import rows write"
ON public.directory_material_import_rows
FOR ALL
TO authenticated
USING (private.workspace_can_write_directory(workspace_owner_id))
WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));
