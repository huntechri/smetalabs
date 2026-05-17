-- ============================================================================
-- Migration: 019_directory_suppliers_foundation
-- Description: DB foundation for workspace-scoped directory suppliers catalog.
-- Date: 2026-05-17
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE directory_supplier_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE directory_supplier_legal_status AS ENUM ('juridical', 'individual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.directory_suppliers (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  legal_status directory_supplier_legal_status NOT NULL,
  color text NOT NULL DEFAULT '#64748B',
  inn text,
  phone text,
  email text,
  address text,
  notes text,
  status directory_supplier_status NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT uq_directory_suppliers_id_workspace UNIQUE (id, workspace_owner_id),
  CONSTRAINT chk_directory_suppliers_name_not_empty CHECK (btrim(name) <> ''),
  CONSTRAINT chk_directory_suppliers_normalized_name_not_empty CHECK (btrim(normalized_name) <> ''),
  CONSTRAINT chk_directory_suppliers_version_positive CHECK (version > 0),
  CONSTRAINT chk_directory_suppliers_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_directory_suppliers_workspace_inn_active
  ON public.directory_suppliers(workspace_owner_id, inn)
  WHERE inn IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_directory_suppliers_workspace_status_deleted
  ON public.directory_suppliers(workspace_owner_id, status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_directory_suppliers_workspace_normalized_name
  ON public.directory_suppliers(workspace_owner_id, normalized_name);

CREATE INDEX IF NOT EXISTS idx_directory_suppliers_workspace_updated_at
  ON public.directory_suppliers(workspace_owner_id, updated_at);

DROP TRIGGER IF EXISTS trg_directory_suppliers_updated_at ON public.directory_suppliers;
CREATE TRIGGER trg_directory_suppliers_updated_at
BEFORE UPDATE ON public.directory_suppliers
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.directory_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS directory_suppliers_select_workspace ON public.directory_suppliers;
CREATE POLICY directory_suppliers_select_workspace
ON public.directory_suppliers
FOR SELECT
TO authenticated
USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS directory_suppliers_insert_workspace ON public.directory_suppliers;
CREATE POLICY directory_suppliers_insert_workspace
ON public.directory_suppliers
FOR INSERT
TO authenticated
WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS directory_suppliers_update_workspace ON public.directory_suppliers;
CREATE POLICY directory_suppliers_update_workspace
ON public.directory_suppliers
FOR UPDATE
TO authenticated
USING (private.workspace_can_write_directory(workspace_owner_id))
WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

GRANT SELECT, INSERT, UPDATE ON public.directory_suppliers TO authenticated;
