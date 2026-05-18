-- ============================================================================
-- Migration: 030_global_purchases_project_sort_index
-- Description: Add project/date/name index for procurements list ordering.
-- Date: 2026-05-18
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_global_purchases_workspace_project_sort
  ON public.global_purchases(workspace_owner_id, project_title, purchase_date, normalized_title, id)
  WHERE archived_at IS NULL AND deleted_at IS NULL;
