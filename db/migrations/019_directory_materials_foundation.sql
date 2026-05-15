-- ============================================================================
-- Migration: 019_directory_materials_foundation
-- Description: DB foundation for workspace-scoped directory materials catalog.
-- Date: 2026-05-15
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 1. ENUM types
DO $$ BEGIN
  CREATE TYPE public.directory_material_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Helpers
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.directory_material_normalize(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(lower(trim(coalesce(value, ''))), '\s+', ' ', 'g');
$$;

CREATE OR REPLACE FUNCTION private.directory_material_build_search_text(
  p_name text,
  p_code text,
  p_unit_code text,
  p_unit_label text,
  p_category text,
  p_subcategory text,
  p_supplier_name text,
  p_description text,
  p_source_name text,
  p_source_external_row_key text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT trim(concat_ws(' ',
    p_name,
    p_code,
    p_unit_code,
    p_unit_label,
    p_category,
    p_subcategory,
    p_supplier_name,
    p_description,
    p_source_name,
    p_source_external_row_key
  ));
$$;

CREATE OR REPLACE FUNCTION private.directory_material_build_fingerprint(
  p_normalized_name text,
  p_unit_code text,
  p_category text,
  p_subcategory text,
  p_code text,
  p_supplier_name text,
  p_source_name text,
  p_source_external_row_key text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT md5(concat_ws('|',
    private.directory_material_normalize(p_normalized_name),
    private.directory_material_normalize(p_unit_code),
    private.directory_material_normalize(p_category),
    private.directory_material_normalize(coalesce(p_subcategory, '')),
    private.directory_material_normalize(coalesce(p_code, '')),
    private.directory_material_normalize(coalesce(p_supplier_name, '')),
    private.directory_material_normalize(coalesce(p_source_name, '')),
    private.directory_material_normalize(coalesce(p_source_external_row_key, ''))
  ));
$$;

CREATE OR REPLACE FUNCTION private.set_directory_material_search_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.normalized_name = private.directory_material_normalize(NEW.name);
  NEW.search_text = private.directory_material_build_search_text(
    NEW.name,
    NEW.code,
    NEW.unit_code,
    NEW.unit_label,
    NEW.category,
    NEW.subcategory,
    NEW.supplier_name,
    NEW.description,
    NEW.source_name,
    NEW.source_external_row_key
  );
  NEW.dedupe_fingerprint = private.directory_material_build_fingerprint(
    NEW.normalized_name,
    NEW.unit_code,
    NEW.category,
    NEW.subcategory,
    NEW.code,
    NEW.supplier_name,
    NEW.source_name,
    NEW.source_external_row_key
  );
  NEW.search_fts =
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.code, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.subcategory, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.supplier_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.unit_code, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(NEW.unit_label, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(NEW.source_name, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(NEW.source_external_row_key, '')), 'D');
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Canonical table
CREATE TABLE IF NOT EXISTS public.directory_materials (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  unit_code text NOT NULL,
  unit_label text NOT NULL,
  price_amount numeric(12,2) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'RUB',
  category text NOT NULL,
  subcategory text,
  code text,
  supplier_name text,
  supplier_id uuid,
  image_url text,
  description text,
  source_name text,
  source_external_row_key text,
  dedupe_fingerprint text NOT NULL,
  search_text text NOT NULL,
  search_fts tsvector NOT NULL,
  status public.directory_material_status NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT uq_directory_materials_id_workspace UNIQUE (id, workspace_owner_id),
  CONSTRAINT chk_directory_materials_name_not_empty CHECK (btrim(name) <> ''),
  CONSTRAINT chk_directory_materials_unit_code_not_empty CHECK (btrim(unit_code) <> ''),
  CONSTRAINT chk_directory_materials_unit_label_not_empty CHECK (btrim(unit_label) <> ''),
  CONSTRAINT chk_directory_materials_category_not_empty CHECK (btrim(category) <> ''),
  CONSTRAINT chk_directory_materials_price_non_negative CHECK (price_amount >= 0),
  CONSTRAINT chk_directory_materials_version_positive CHECK (version > 0),
  CONSTRAINT chk_directory_materials_currency_uppercase CHECK (currency_code ~ '^[A-Z]{3}$')
);

-- 4. Triggers
DROP TRIGGER IF EXISTS trg_directory_materials_search_fields ON public.directory_materials;
CREATE TRIGGER trg_directory_materials_search_fields
  BEFORE INSERT OR UPDATE OF
    name,
    unit_code,
    unit_label,
    category,
    subcategory,
    code,
    supplier_name,
    description,
    source_name,
    source_external_row_key
  ON public.directory_materials
  FOR EACH ROW
  EXECUTE FUNCTION private.set_directory_material_search_fields();

DROP TRIGGER IF EXISTS trg_directory_materials_updated_at ON public.directory_materials;
CREATE TRIGGER trg_directory_materials_updated_at
  BEFORE UPDATE ON public.directory_materials
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

-- 5. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_directory_materials_workspace_code_active
  ON public.directory_materials(workspace_owner_id, code)
  WHERE code IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_directory_materials_workspace_source_key_active
  ON public.directory_materials(workspace_owner_id, source_name, source_external_row_key)
  WHERE source_name IS NOT NULL
    AND source_external_row_key IS NOT NULL
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_directory_materials_workspace_status_deleted
  ON public.directory_materials(workspace_owner_id, status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_directory_materials_workspace_category_subcategory
  ON public.directory_materials(workspace_owner_id, category, subcategory);

CREATE INDEX IF NOT EXISTS idx_directory_materials_workspace_unit
  ON public.directory_materials(workspace_owner_id, unit_code);

CREATE INDEX IF NOT EXISTS idx_directory_materials_workspace_normalized_name
  ON public.directory_materials(workspace_owner_id, normalized_name);

CREATE INDEX IF NOT EXISTS idx_directory_materials_workspace_supplier_name
  ON public.directory_materials(workspace_owner_id, supplier_name);

CREATE INDEX IF NOT EXISTS idx_directory_materials_workspace_dedupe
  ON public.directory_materials(workspace_owner_id, dedupe_fingerprint);

CREATE INDEX IF NOT EXISTS idx_directory_materials_workspace_updated_at
  ON public.directory_materials(workspace_owner_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_directory_materials_search_fts
  ON public.directory_materials USING gin(search_fts);

CREATE INDEX IF NOT EXISTS idx_directory_materials_normalized_name_trgm
  ON public.directory_materials USING gin(normalized_name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_directory_materials_search_text_trgm
  ON public.directory_materials USING gin(search_text extensions.gin_trgm_ops);

-- 6. RLS
ALTER TABLE public.directory_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "directory_materials_select" ON public.directory_materials;
CREATE POLICY "directory_materials_select" ON public.directory_materials
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "directory_materials_insert" ON public.directory_materials;
CREATE POLICY "directory_materials_insert" ON public.directory_materials
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_materials_update" ON public.directory_materials;
CREATE POLICY "directory_materials_update" ON public.directory_materials
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_materials_delete" ON public.directory_materials;
CREATE POLICY "directory_materials_delete" ON public.directory_materials
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

-- 7. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.directory_materials TO authenticated;

REVOKE EXECUTE ON FUNCTION private.directory_material_normalize(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.directory_material_build_search_text(text, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.directory_material_build_fingerprint(text, text, text, text, text, text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.directory_material_normalize(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.directory_material_build_search_text(text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.directory_material_build_fingerprint(text, text, text, text, text, text, text, text) TO authenticated;
