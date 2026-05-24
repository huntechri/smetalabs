-- ============================================================================
-- Migration: 047_project_estimate_purchases_foundation
-- Description: Create project_estimate_purchases table — per-estimate purchase facts.
--   Separate from global_purchases: each estimate tracks its own purchases,
--   with direct links to estimate record, directory material, and estimate material.
--   Fact aggregation in get_estimate_purchases switches from global_purchases
--   to this table.
-- Date: 2026-05-24
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_estimate_purchases (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  estimate_record_id uuid NOT NULL REFERENCES public.project_estimate_records(id) ON DELETE CASCADE,
  directory_material_id uuid REFERENCES public.directory_materials(id) ON DELETE SET NULL,
  estimate_material_id uuid REFERENCES public.project_estimate_materials(id) ON DELETE SET NULL,
  title text NOT NULL,
  unit text NOT NULL,
  quantity numeric(14, 3) NOT NULL DEFAULT 0,
  price numeric(14, 2) NOT NULL DEFAULT 0,
  total numeric(14, 2) NOT NULL DEFAULT 0,
  supplier_name text,
  purchase_date text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT chk_pep_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT chk_pep_unit_not_empty CHECK (btrim(unit) <> ''),
  CONSTRAINT chk_pep_quantity_non_negative CHECK (quantity >= 0),
  CONSTRAINT chk_pep_price_non_negative CHECK (price >= 0),
  CONSTRAINT chk_pep_total_non_negative CHECK (total >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pep_estimate
  ON public.project_estimate_purchases(estimate_record_id, workspace_owner_id);

CREATE INDEX IF NOT EXISTS idx_pep_material
  ON public.project_estimate_purchases(estimate_record_id, directory_material_id)
  WHERE directory_material_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pep_archived
  ON public.project_estimate_purchases(workspace_owner_id, archived_at);

-- RLS
ALTER TABLE public.project_estimate_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_estimate_purchases_select" ON public.project_estimate_purchases;
CREATE POLICY "project_estimate_purchases_select" ON public.project_estimate_purchases
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_purchases_insert" ON public.project_estimate_purchases;
CREATE POLICY "project_estimate_purchases_insert" ON public.project_estimate_purchases
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_purchases_update" ON public.project_estimate_purchases;
CREATE POLICY "project_estimate_purchases_update" ON public.project_estimate_purchases
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_purchases_delete" ON public.project_estimate_purchases;
CREATE POLICY "project_estimate_purchases_delete" ON public.project_estimate_purchases
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_estimate_purchases TO authenticated;
