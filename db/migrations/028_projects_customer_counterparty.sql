-- ============================================================================
-- Migration: 028_projects_customer_counterparty
-- Description: Link projects to customer counterparties while keeping a display snapshot.
-- Date: 2026-05-17
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS customer_counterparty_id uuid REFERENCES public.directory_counterparties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_workspace_customer_counterparty
  ON public.projects(workspace_owner_id, customer_counterparty_id)
  WHERE customer_counterparty_id IS NOT NULL AND deleted_at IS NULL;
