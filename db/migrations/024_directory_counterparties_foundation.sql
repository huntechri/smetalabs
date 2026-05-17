-- ============================================================================
-- Migration: 024_directory_counterparties_foundation
-- Description: DB foundation for workspace-scoped directory counterparties catalog.
-- Date: 2026-05-17
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

DO $$ BEGIN
  CREATE TYPE public.directory_counterparty_type AS ENUM ('customer', 'contractor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.directory_counterparty_legal_status AS ENUM ('juridical', 'individual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.directory_counterparty_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.directory_counterparty_normalize(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(lower(trim(coalesce(value, ''))), '\s+', ' ', 'g');
$$;

CREATE OR REPLACE FUNCTION private.directory_counterparty_build_search_text(
  p_name text,
  p_inn text,
  p_phone text,
  p_legal_address text,
  p_bank_name text,
  p_bik text,
  p_corr_account text,
  p_account_number text,
  p_passport_series text,
  p_passport_number text,
  p_passport_issued_by text,
  p_passport_issue_date text,
  p_passport_department_code text,
  p_registration_address text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT trim(concat_ws(' ',
    p_name,
    p_inn,
    p_phone,
    p_legal_address,
    p_bank_name,
    p_bik,
    p_corr_account,
    p_account_number,
    p_passport_series,
    p_passport_number,
    p_passport_issued_by,
    p_passport_issue_date,
    p_passport_department_code,
    p_registration_address
  ));
$$;

CREATE OR REPLACE FUNCTION private.set_directory_counterparty_search_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.normalized_name = private.directory_counterparty_normalize(NEW.name);
  NEW.search_text = private.directory_counterparty_build_search_text(
    NEW.name,
    NEW.inn,
    NEW.phone,
    NEW.legal_address,
    NEW.bank_name,
    NEW.bik,
    NEW.corr_account,
    NEW.account_number,
    NEW.passport_series,
    NEW.passport_number,
    NEW.passport_issued_by,
    NEW.passport_issue_date,
    NEW.passport_department_code,
    NEW.registration_address
  );
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.directory_counterparties (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  type public.directory_counterparty_type NOT NULL,
  legal_status public.directory_counterparty_legal_status NOT NULL,
  inn text,
  phone text,
  legal_address text,
  bank_name text,
  bik text,
  corr_account text,
  account_number text,
  passport_series text,
  passport_number text,
  passport_issued_by text,
  passport_issue_date text,
  passport_department_code text,
  registration_address text,
  search_text text NOT NULL,
  status public.directory_counterparty_status NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT uq_directory_counterparties_id_workspace UNIQUE (id, workspace_owner_id),
  CONSTRAINT chk_directory_counterparties_name_not_empty CHECK (btrim(name) <> ''),
  CONSTRAINT chk_directory_counterparties_version_positive CHECK (version > 0)
);

DROP TRIGGER IF EXISTS trg_directory_counterparties_search_fields ON public.directory_counterparties;
CREATE TRIGGER trg_directory_counterparties_search_fields
  BEFORE INSERT OR UPDATE OF
    name,
    inn,
    phone,
    legal_address,
    bank_name,
    bik,
    corr_account,
    account_number,
    passport_series,
    passport_number,
    passport_issued_by,
    passport_issue_date,
    passport_department_code,
    registration_address
  ON public.directory_counterparties
  FOR EACH ROW
  EXECUTE FUNCTION private.set_directory_counterparty_search_fields();

DROP TRIGGER IF EXISTS trg_directory_counterparties_updated_at ON public.directory_counterparties;
CREATE TRIGGER trg_directory_counterparties_updated_at
  BEFORE UPDATE ON public.directory_counterparties
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS uq_directory_counterparties_workspace_inn_active
  ON public.directory_counterparties(workspace_owner_id, inn)
  WHERE inn IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_directory_counterparties_workspace_status_deleted
  ON public.directory_counterparties(workspace_owner_id, status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_directory_counterparties_workspace_type
  ON public.directory_counterparties(workspace_owner_id, type);

CREATE INDEX IF NOT EXISTS idx_directory_counterparties_workspace_legal_status
  ON public.directory_counterparties(workspace_owner_id, legal_status);

CREATE INDEX IF NOT EXISTS idx_directory_counterparties_workspace_normalized_name
  ON public.directory_counterparties(workspace_owner_id, normalized_name);

CREATE INDEX IF NOT EXISTS idx_directory_counterparties_workspace_updated_at
  ON public.directory_counterparties(workspace_owner_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_directory_counterparties_normalized_name_trgm
  ON public.directory_counterparties USING gin(normalized_name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_directory_counterparties_search_text_trgm
  ON public.directory_counterparties USING gin(search_text extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_directory_counterparties_inn_trgm
  ON public.directory_counterparties USING gin(inn extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_directory_counterparties_phone_trgm
  ON public.directory_counterparties USING gin(phone extensions.gin_trgm_ops);

ALTER TABLE public.directory_counterparties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "directory_counterparties_select" ON public.directory_counterparties;
CREATE POLICY "directory_counterparties_select" ON public.directory_counterparties
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "directory_counterparties_insert" ON public.directory_counterparties;
CREATE POLICY "directory_counterparties_insert" ON public.directory_counterparties
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_counterparties_update" ON public.directory_counterparties;
CREATE POLICY "directory_counterparties_update" ON public.directory_counterparties
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "directory_counterparties_delete" ON public.directory_counterparties;
CREATE POLICY "directory_counterparties_delete" ON public.directory_counterparties
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.directory_counterparties TO authenticated;

REVOKE EXECUTE ON FUNCTION private.directory_counterparty_normalize(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.directory_counterparty_build_search_text(text, text, text, text, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.directory_counterparty_normalize(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.directory_counterparty_build_search_text(text, text, text, text, text, text, text, text, text, text, text, text, text, text) TO authenticated;
