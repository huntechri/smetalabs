-- ============================================================================
-- Migration: 010_directory_works_foundation
-- Description: DB foundation for workspace-scoped directory works catalog.
-- Date: 2026-05-13
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 1. ENUM types
DO $$ BEGIN
  CREATE TYPE directory_work_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE directory_work_price_kind AS ENUM (
    'base',
    'labor',
    'turnkey',
    'estimate',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE directory_work_term_source AS ENUM (
    'manual',
    'import',
    'ai_suggestion',
    'external'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE directory_work_import_job_status AS ENUM (
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
  CREATE TYPE directory_work_import_row_status AS ENUM (
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
  CREATE TYPE directory_work_import_row_action AS ENUM (
    'create',
    'update',
    'skip'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE directory_work_embedding_status AS ENUM (
    'pending',
    'ready',
    'stale',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Helpers
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.workspace_can_read(workspace_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.user_id = (select auth.uid())
      AND wm.owner_id = workspace_owner_id
      AND wm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.workspace_can_write_directory(workspace_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.workspace_role_for(workspace_owner_id) IN ('owner', 'admin', 'manager');
$$;

CREATE OR REPLACE FUNCTION private.directory_work_normalize(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(lower(trim(coalesce(value, ''))), '\s+', ' ', 'g');
$$;

CREATE OR REPLACE FUNCTION private.directory_work_build_search_text(
  p_title text,
  p_code text,
  p_unit_code text,
  p_unit_label text,
  p_category text,
  p_subcategory text,
  p_description text,
  p_included_operations text,
  p_excluded_operations text,
  p_source_name text,
  p_source_external_row_key text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT trim(concat_ws(' ',
    p_title,
    p_code,
    p_unit_code,
    p_unit_label,
    p_category,
    p_subcategory,
    p_description,
    p_included_operations,
    p_excluded_operations,
    p_source_name,
    p_source_external_row_key
  ));
$$;

CREATE OR REPLACE FUNCTION private.directory_work_build_fingerprint(
  p_normalized_title text,
  p_unit_code text,
  p_category text,
  p_subcategory text,
  p_code text,
  p_source_name text,
  p_source_external_row_key text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT md5(concat_ws('|',
    private.directory_work_normalize(p_normalized_title),
    private.directory_work_normalize(p_unit_code),
    private.directory_work_normalize(p_category),
    private.directory_work_normalize(coalesce(p_subcategory, '')),
    private.directory_work_normalize(coalesce(p_code, '')),
    private.directory_work_normalize(coalesce(p_source_name, '')),
    private.directory_work_normalize(coalesce(p_source_external_row_key, ''))
  ));
$$;

CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_directory_work_search_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.normalized_title = private.directory_work_normalize(NEW.title);
  NEW.search_text = private.directory_work_build_search_text(
    NEW.title,
    NEW.code,
    NEW.unit_code,
    NEW.unit_label,
    NEW.category,
    NEW.subcategory,
    NEW.description,
    NEW.included_operations,
    NEW.excluded_operations,
    NEW.source_name,
    NEW.source_external_row_key
  );
  NEW.dedupe_fingerprint = private.directory_work_build_fingerprint(
    NEW.normalized_title,
    NEW.unit_code,
    NEW.category,
    NEW.subcategory,
    NEW.code,
    NEW.source_name,
    NEW.source_external_row_key
  );
  NEW.search_fts =
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.code, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.subcategory, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.included_operations, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.excluded_operations, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(NEW.unit_code, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(NEW.unit_label, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(NEW.source_name, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(NEW.source_external_row_key, '')), 'D');
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_work_alias_normalized_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.normalized_alias = private.directory_work_normalize(NEW.alias);
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_work_keyword_normalized_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.normalized_keyword = private.directory_work_normalize(NEW.keyword);
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Canonical and supporting tables
CREATE TABLE IF NOT EXISTS public.directory_works (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  normalized_title text NOT NULL,
  unit_code text NOT NULL,
  unit_label text NOT NULL,
  rate_amount numeric(12,2) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'RUB',
  price_kind directory_work_price_kind NOT NULL DEFAULT 'base',
  category text NOT NULL,
  subcategory text,
  code text,
  description text,
  included_operations text,
  excluded_operations text,
  source_name text,
  source_external_row_key text,
  dedupe_fingerprint text NOT NULL,
  search_text text NOT NULL,
  search_fts tsvector NOT NULL,
  status directory_work_status NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT uq_directory_works_id_workspace UNIQUE (id, workspace_owner_id),
  CONSTRAINT chk_directory_works_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT chk_directory_works_unit_code_not_empty CHECK (btrim(unit_code) <> ''),
  CONSTRAINT chk_directory_works_unit_label_not_empty CHECK (btrim(unit_label) <> ''),
  CONSTRAINT chk_directory_works_category_not_empty CHECK (btrim(category) <> ''),
  CONSTRAINT chk_directory_works_rate_non_negative CHECK (rate_amount >= 0),
  CONSTRAINT chk_directory_works_version_positive CHECK (version > 0),
  CONSTRAINT chk_directory_works_currency_uppercase CHECK (currency_code ~ '^[A-Z]{3}$')
);

CREATE TABLE IF NOT EXISTS public.work_aliases (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id uuid NOT NULL,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  source directory_work_term_source NOT NULL DEFAULT 'manual',
  weight integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT fk_work_aliases_work_workspace
    FOREIGN KEY (work_id, workspace_owner_id)
    REFERENCES public.directory_works(id, workspace_owner_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT chk_work_aliases_alias_not_empty CHECK (btrim(alias) <> ''),
  CONSTRAINT chk_work_aliases_weight_positive CHECK (weight > 0)
);

CREATE TABLE IF NOT EXISTS public.work_keywords (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id uuid NOT NULL,
  keyword text NOT NULL,
  normalized_keyword text NOT NULL,
  source directory_work_term_source NOT NULL DEFAULT 'manual',
  weight integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT fk_work_keywords_work_workspace
    FOREIGN KEY (work_id, workspace_owner_id)
    REFERENCES public.directory_works(id, workspace_owner_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT chk_work_keywords_keyword_not_empty CHECK (btrim(keyword) <> ''),
  CONSTRAINT chk_work_keywords_weight_positive CHECK (weight > 0)
);

-- 4. Import/embedding foundation tables only. No import business logic or generation jobs.
CREATE TABLE IF NOT EXISTS public.directory_work_import_jobs (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status directory_work_import_job_status NOT NULL DEFAULT 'draft',
  source_name text,
  file_name text,
  file_mime_type text,
  file_size_bytes bigint,
  storage_bucket text,
  storage_path text,
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
  CONSTRAINT uq_directory_work_import_jobs_id_workspace UNIQUE (id, workspace_owner_id),
  CONSTRAINT chk_directory_work_import_jobs_total_rows_non_negative CHECK (total_rows >= 0),
  CONSTRAINT chk_directory_work_import_jobs_parsed_rows_non_negative CHECK (parsed_rows >= 0),
  CONSTRAINT chk_directory_work_import_jobs_valid_rows_non_negative CHECK (valid_rows >= 0),
  CONSTRAINT chk_directory_work_import_jobs_warning_rows_non_negative CHECK (warning_rows >= 0),
  CONSTRAINT chk_directory_work_import_jobs_error_rows_non_negative CHECK (error_rows >= 0),
  CONSTRAINT chk_directory_work_import_jobs_duplicate_rows_non_negative CHECK (duplicate_rows >= 0),
  CONSTRAINT chk_directory_work_import_jobs_conflict_rows_non_negative CHECK (conflict_rows >= 0),
  CONSTRAINT chk_directory_work_import_jobs_applied_rows_non_negative CHECK (applied_rows >= 0),
  CONSTRAINT chk_directory_work_import_jobs_skipped_rows_non_negative CHECK (skipped_rows >= 0)
);

CREATE TABLE IF NOT EXISTS public.directory_work_import_rows (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL,
  row_number integer NOT NULL,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status directory_work_import_row_status NOT NULL DEFAULT 'pending',
  action directory_work_import_row_action,
  error_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  warning_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  duplicate_work_id uuid REFERENCES public.directory_works(id) ON DELETE SET NULL,
  conflict_work_ids uuid[],
  dedupe_fingerprint text,
  applied_work_id uuid REFERENCES public.directory_works(id) ON DELETE SET NULL,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_directory_work_import_rows_job_workspace
    FOREIGN KEY (job_id, workspace_owner_id)
    REFERENCES public.directory_work_import_jobs(id, workspace_owner_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT uq_directory_work_import_rows_job_row_number UNIQUE (job_id, row_number),
  CONSTRAINT chk_directory_work_import_rows_row_number_positive CHECK (row_number > 0)
);

CREATE TABLE IF NOT EXISTS public.directory_work_embeddings (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id uuid NOT NULL,
  model_name text NOT NULL,
  dimensions integer NOT NULL,
  content_hash text NOT NULL,
  embedding extensions.vector,
  status directory_work_embedding_status NOT NULL DEFAULT 'pending',
  embedding_input_text text NOT NULL,
  generated_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_directory_work_embeddings_work_workspace
    FOREIGN KEY (work_id, workspace_owner_id)
    REFERENCES public.directory_works(id, workspace_owner_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT chk_directory_work_embeddings_model_name_not_empty CHECK (btrim(model_name) <> ''),
  CONSTRAINT chk_directory_work_embeddings_dimensions_positive CHECK (dimensions > 0),
  CONSTRAINT chk_directory_work_embeddings_content_hash_not_empty CHECK (btrim(content_hash) <> ''),
  CONSTRAINT chk_directory_work_embeddings_input_not_empty CHECK (btrim(embedding_input_text) <> '')
);

-- 5. Triggers
DROP TRIGGER IF EXISTS trg_directory_works_search_fields ON public.directory_works;
CREATE TRIGGER trg_directory_works_search_fields
  BEFORE INSERT OR UPDATE OF
    title,
    unit_code,
    unit_label,
    category,
    subcategory,
    code,
    description,
    included_operations,
    excluded_operations,
    source_name,
    source_external_row_key
  ON public.directory_works
  FOR EACH ROW
  EXECUTE FUNCTION private.set_directory_work_search_fields();

DROP TRIGGER IF EXISTS trg_directory_works_updated_at ON public.directory_works;
CREATE TRIGGER trg_directory_works_updated_at
  BEFORE UPDATE ON public.directory_works
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_work_aliases_normalized_fields ON public.work_aliases;
CREATE TRIGGER trg_work_aliases_normalized_fields
  BEFORE INSERT OR UPDATE OF alias
  ON public.work_aliases
  FOR EACH ROW
  EXECUTE FUNCTION private.set_work_alias_normalized_fields();

DROP TRIGGER IF EXISTS trg_work_aliases_updated_at ON public.work_aliases;
CREATE TRIGGER trg_work_aliases_updated_at
  BEFORE UPDATE ON public.work_aliases
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_work_keywords_normalized_fields ON public.work_keywords;
CREATE TRIGGER trg_work_keywords_normalized_fields
  BEFORE INSERT OR UPDATE OF keyword
  ON public.work_keywords
  FOR EACH ROW
  EXECUTE FUNCTION private.set_work_keyword_normalized_fields();

DROP TRIGGER IF EXISTS trg_work_keywords_updated_at ON public.work_keywords;
CREATE TRIGGER trg_work_keywords_updated_at
  BEFORE UPDATE ON public.work_keywords
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_directory_work_import_jobs_updated_at ON public.directory_work_import_jobs;
CREATE TRIGGER trg_directory_work_import_jobs_updated_at
  BEFORE UPDATE ON public.directory_work_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_directory_work_import_rows_updated_at ON public.directory_work_import_rows;
CREATE TRIGGER trg_directory_work_import_rows_updated_at
  BEFORE UPDATE ON public.directory_work_import_rows
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_directory_work_embeddings_updated_at ON public.directory_work_embeddings;
CREATE TRIGGER trg_directory_work_embeddings_updated_at
  BEFORE UPDATE ON public.directory_work_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_directory_works_workspace_status_deleted
  ON public.directory_works(workspace_owner_id, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_directory_works_workspace_category_subcategory
  ON public.directory_works(workspace_owner_id, category, subcategory);
CREATE INDEX IF NOT EXISTS idx_directory_works_workspace_normalized_title
  ON public.directory_works(workspace_owner_id, normalized_title);
CREATE INDEX IF NOT EXISTS idx_directory_works_workspace_code
  ON public.directory_works(workspace_owner_id, code);
CREATE INDEX IF NOT EXISTS idx_directory_works_workspace_code_active
  ON public.directory_works(workspace_owner_id, code)
  WHERE code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_directory_works_workspace_source_key
  ON public.directory_works(workspace_owner_id, source_name, source_external_row_key);
CREATE INDEX IF NOT EXISTS idx_directory_works_workspace_source_key_active
  ON public.directory_works(workspace_owner_id, source_name, source_external_row_key)
  WHERE source_name IS NOT NULL
    AND source_external_row_key IS NOT NULL
    AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_directory_works_workspace_dedupe
  ON public.directory_works(workspace_owner_id, dedupe_fingerprint);
CREATE INDEX IF NOT EXISTS idx_directory_works_workspace_updated_at
  ON public.directory_works(workspace_owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_directory_works_search_fts
  ON public.directory_works USING gin(search_fts);
CREATE INDEX IF NOT EXISTS idx_directory_works_normalized_title_trgm
  ON public.directory_works USING gin(normalized_title extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_directory_works_search_text_trgm
  ON public.directory_works USING gin(search_text extensions.gin_trgm_ops);

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_aliases_workspace_work_alias_active
  ON public.work_aliases(workspace_owner_id, work_id, normalized_alias)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_aliases_workspace_work
  ON public.work_aliases(workspace_owner_id, work_id);
CREATE INDEX IF NOT EXISTS idx_work_aliases_workspace_normalized_alias
  ON public.work_aliases(workspace_owner_id, normalized_alias);
CREATE INDEX IF NOT EXISTS idx_work_aliases_normalized_alias_trgm
  ON public.work_aliases USING gin(normalized_alias extensions.gin_trgm_ops);

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_keywords_workspace_work_keyword_active
  ON public.work_keywords(workspace_owner_id, work_id, normalized_keyword)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_keywords_workspace_work
  ON public.work_keywords(workspace_owner_id, work_id);
CREATE INDEX IF NOT EXISTS idx_work_keywords_workspace_normalized_keyword
  ON public.work_keywords(workspace_owner_id, normalized_keyword);
CREATE INDEX IF NOT EXISTS idx_work_keywords_normalized_keyword_trgm
  ON public.work_keywords USING gin(normalized_keyword extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_directory_work_import_jobs_workspace_status_created
  ON public.directory_work_import_jobs(workspace_owner_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_directory_work_import_rows_workspace_job_status
  ON public.directory_work_import_rows(workspace_owner_id, job_id, status);
CREATE INDEX IF NOT EXISTS idx_directory_work_import_rows_workspace_dedupe
  ON public.directory_work_import_rows(workspace_owner_id, dedupe_fingerprint);
CREATE UNIQUE INDEX IF NOT EXISTS uq_directory_work_embeddings_work_model_hash
  ON public.directory_work_embeddings(workspace_owner_id, work_id, model_name, content_hash);
CREATE INDEX IF NOT EXISTS idx_directory_work_embeddings_workspace_status
  ON public.directory_work_embeddings(workspace_owner_id, status);
CREATE INDEX IF NOT EXISTS idx_directory_work_embeddings_workspace_work
  ON public.directory_work_embeddings(workspace_owner_id, work_id);

-- HNSW/vector indexes are intentionally deferred until the AI phase fixes model and dimensions.

-- 7. RLS
ALTER TABLE public.directory_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_work_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_work_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_work_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "directory_works_select" ON public.directory_works;
CREATE POLICY "directory_works_select" ON public.directory_works
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "directory_works_insert" ON public.directory_works;
CREATE POLICY "directory_works_insert" ON public.directory_works
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_works_update" ON public.directory_works;
CREATE POLICY "directory_works_update" ON public.directory_works
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_works_delete" ON public.directory_works;
CREATE POLICY "directory_works_delete" ON public.directory_works
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "work_aliases_select" ON public.work_aliases;
CREATE POLICY "work_aliases_select" ON public.work_aliases
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "work_aliases_insert" ON public.work_aliases;
CREATE POLICY "work_aliases_insert" ON public.work_aliases
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "work_aliases_update" ON public.work_aliases;
CREATE POLICY "work_aliases_update" ON public.work_aliases
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "work_aliases_delete" ON public.work_aliases;
CREATE POLICY "work_aliases_delete" ON public.work_aliases
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "work_keywords_select" ON public.work_keywords;
CREATE POLICY "work_keywords_select" ON public.work_keywords
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "work_keywords_insert" ON public.work_keywords;
CREATE POLICY "work_keywords_insert" ON public.work_keywords
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "work_keywords_update" ON public.work_keywords;
CREATE POLICY "work_keywords_update" ON public.work_keywords
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "work_keywords_delete" ON public.work_keywords;
CREATE POLICY "work_keywords_delete" ON public.work_keywords
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_import_jobs_select" ON public.directory_work_import_jobs;
CREATE POLICY "directory_work_import_jobs_select" ON public.directory_work_import_jobs
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_import_jobs_insert" ON public.directory_work_import_jobs;
CREATE POLICY "directory_work_import_jobs_insert" ON public.directory_work_import_jobs
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_import_jobs_update" ON public.directory_work_import_jobs;
CREATE POLICY "directory_work_import_jobs_update" ON public.directory_work_import_jobs
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_import_jobs_delete" ON public.directory_work_import_jobs;
CREATE POLICY "directory_work_import_jobs_delete" ON public.directory_work_import_jobs
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_import_rows_select" ON public.directory_work_import_rows;
CREATE POLICY "directory_work_import_rows_select" ON public.directory_work_import_rows
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_import_rows_insert" ON public.directory_work_import_rows;
CREATE POLICY "directory_work_import_rows_insert" ON public.directory_work_import_rows
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_import_rows_update" ON public.directory_work_import_rows;
CREATE POLICY "directory_work_import_rows_update" ON public.directory_work_import_rows
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_import_rows_delete" ON public.directory_work_import_rows;
CREATE POLICY "directory_work_import_rows_delete" ON public.directory_work_import_rows
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_embeddings_select" ON public.directory_work_embeddings;
CREATE POLICY "directory_work_embeddings_select" ON public.directory_work_embeddings
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_embeddings_insert" ON public.directory_work_embeddings;
CREATE POLICY "directory_work_embeddings_insert" ON public.directory_work_embeddings
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_embeddings_update" ON public.directory_work_embeddings;
CREATE POLICY "directory_work_embeddings_update" ON public.directory_work_embeddings
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_work_embeddings_delete" ON public.directory_work_embeddings;
CREATE POLICY "directory_work_embeddings_delete" ON public.directory_work_embeddings
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

-- 8. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.directory_works TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_aliases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_keywords TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.directory_work_import_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.directory_work_import_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.directory_work_embeddings TO authenticated;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.workspace_can_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workspace_can_write_directory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.directory_work_normalize(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.directory_work_build_search_text(text, text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.directory_work_build_fingerprint(text, text, text, text, text, text, text) TO authenticated;
