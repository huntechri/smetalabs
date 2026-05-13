-- ============================================================================
-- Migration: 013_directory_works_performance_hardening
-- Description: Add query-pattern indexes and DB-side diagnostics for issue #71.
-- Date: 2026-05-14
-- ============================================================================

-- The initial foundation migrations created broad indexes for correctness and search.
-- This hardening pass adds narrower partial/composite indexes for the concrete
-- production query patterns used by list/search/categories/import/export/AI.

-- Active list and export pagination: workspace + active rows + recency cursor/tie-breaker.
CREATE INDEX IF NOT EXISTS idx_directory_works_active_workspace_updated_id
  ON public.directory_works(workspace_owner_id, updated_at DESC, id)
  WHERE status = 'active' AND deleted_at IS NULL;

-- Active alphabetical browsing and deterministic title_asc ordering.
CREATE INDEX IF NOT EXISTS idx_directory_works_active_workspace_title_id
  ON public.directory_works(workspace_owner_id, normalized_title ASC, id)
  WHERE status = 'active' AND deleted_at IS NULL;

-- Active filter combinations used by toolbar filters and export.
CREATE INDEX IF NOT EXISTS idx_directory_works_active_workspace_category_unit
  ON public.directory_works(workspace_owner_id, category, subcategory, unit_code, updated_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_directory_works_active_workspace_unit
  ON public.directory_works(workspace_owner_id, unit_code, updated_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;

-- Fast exact duplicate detection during imports and manual create/update.
CREATE INDEX IF NOT EXISTS idx_directory_works_active_workspace_dedupe_updated
  ON public.directory_works(workspace_owner_id, dedupe_fingerprint, updated_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;

-- Alias/keyword active term lookups with parent work id available for joins.
CREATE INDEX IF NOT EXISTS idx_work_aliases_active_workspace_alias_work
  ON public.work_aliases(workspace_owner_id, normalized_alias, work_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_keywords_active_workspace_keyword_work
  ON public.work_keywords(workspace_owner_id, normalized_keyword, work_id)
  WHERE deleted_at IS NULL;

-- Import job polling and apply workflow.
CREATE INDEX IF NOT EXISTS idx_directory_work_import_jobs_workspace_recent_active
  ON public.directory_work_import_jobs(workspace_owner_id, updated_at DESC, id)
  WHERE status IN ('draft', 'uploaded', 'parsing', 'parsed', 'validating', 'validated', 'ready_for_review', 'applying');

CREATE INDEX IF NOT EXISTS idx_directory_work_import_rows_job_action_status
  ON public.directory_work_import_rows(workspace_owner_id, job_id, action, status, row_number)
  WHERE action IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_directory_work_import_rows_applied_work
  ON public.directory_work_import_rows(workspace_owner_id, applied_work_id)
  WHERE applied_work_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_directory_work_import_rows_duplicate_work
  ON public.directory_work_import_rows(workspace_owner_id, duplicate_work_id)
  WHERE duplicate_work_id IS NOT NULL;

-- Embedding queue and AI search maintenance. HNSW remains in 012 for vector search;
-- these indexes support queue polling, stale refresh and work-scoped invalidation.
CREATE INDEX IF NOT EXISTS idx_directory_work_embeddings_queue_updated
  ON public.directory_work_embeddings(workspace_owner_id, model_name, dimensions, status, updated_at ASC)
  WHERE status IN ('pending', 'stale', 'failed');

CREATE INDEX IF NOT EXISTS idx_directory_work_embeddings_ready_work_model
  ON public.directory_work_embeddings(workspace_owner_id, work_id, model_name, dimensions, generated_at DESC)
  WHERE status = 'ready';

-- Lightweight DB-side diagnostics for performance audits. These functions are
-- service-role only and are intended for preview/staging checks before tuning.
CREATE OR REPLACE FUNCTION public.explain_directory_works_search_plan(
  p_workspace_owner_id uuid,
  p_q text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_subcategory text DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_status public.directory_work_status DEFAULT 'active',
  p_limit integer DEFAULT 50,
  p_cursor integer DEFAULT 0,
  p_sort text DEFAULT 'relevance'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan jsonb;
BEGIN
  EXECUTE $sql$
    EXPLAIN (FORMAT JSON)
    SELECT *
    FROM public.search_directory_works($1, $2, $3, $4, $5, $6, $7, $8, $9)
  $sql$
  INTO v_plan
  USING
    p_workspace_owner_id,
    p_q,
    p_category,
    p_subcategory,
    p_unit,
    p_status,
    p_limit,
    p_cursor,
    p_sort;

  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.explain_directory_work_categories_plan(
  p_workspace_owner_id uuid,
  p_status public.directory_work_status DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan jsonb;
BEGIN
  EXECUTE $sql$
    EXPLAIN (FORMAT JSON)
    SELECT *
    FROM public.get_directory_work_categories($1, $2)
  $sql$
  INTO v_plan
  USING p_workspace_owner_id, p_status;

  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_directory_works_performance_snapshot(
  p_workspace_owner_id uuid
)
RETURNS TABLE (
  metric text,
  value bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 'works.active'::text, count(*)::bigint
  FROM public.directory_works
  WHERE workspace_owner_id = p_workspace_owner_id
    AND status = 'active'
    AND deleted_at IS NULL

  UNION ALL
  SELECT 'works.archived'::text, count(*)::bigint
  FROM public.directory_works
  WHERE workspace_owner_id = p_workspace_owner_id
    AND status = 'archived'
    AND deleted_at IS NULL

  UNION ALL
  SELECT 'works.deleted'::text, count(*)::bigint
  FROM public.directory_works
  WHERE workspace_owner_id = p_workspace_owner_id
    AND deleted_at IS NOT NULL

  UNION ALL
  SELECT 'import_jobs.open'::text, count(*)::bigint
  FROM public.directory_work_import_jobs
  WHERE workspace_owner_id = p_workspace_owner_id
    AND status IN ('draft', 'uploaded', 'parsing', 'parsed', 'validating', 'validated', 'ready_for_review', 'applying')

  UNION ALL
  SELECT 'import_rows.unresolved'::text, count(*)::bigint
  FROM public.directory_work_import_rows
  WHERE workspace_owner_id = p_workspace_owner_id
    AND status IN ('pending', 'valid', 'warning', 'error', 'duplicate', 'conflict')

  UNION ALL
  SELECT 'embeddings.ready'::text, count(*)::bigint
  FROM public.directory_work_embeddings
  WHERE workspace_owner_id = p_workspace_owner_id
    AND status = 'ready'

  UNION ALL
  SELECT 'embeddings.pending_or_stale_or_failed'::text, count(*)::bigint
  FROM public.directory_work_embeddings
  WHERE workspace_owner_id = p_workspace_owner_id
    AND status IN ('pending', 'stale', 'failed')

  UNION ALL
  SELECT 'works.active_without_ready_embedding'::text, count(*)::bigint
  FROM public.directory_works w
  WHERE w.workspace_owner_id = p_workspace_owner_id
    AND w.status = 'active'
    AND w.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.directory_work_embeddings e
      WHERE e.workspace_owner_id = w.workspace_owner_id
        AND e.work_id = w.id
        AND e.status = 'ready'
    );
$$;

REVOKE EXECUTE ON FUNCTION public.explain_directory_works_search_plan(uuid, text, text, text, text, public.directory_work_status, integer, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.explain_directory_work_categories_plan(uuid, public.directory_work_status) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_directory_works_performance_snapshot(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.explain_directory_works_search_plan(uuid, text, text, text, text, public.directory_work_status, integer, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.explain_directory_work_categories_plan(uuid, public.directory_work_status) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_directory_works_performance_snapshot(uuid) TO service_role;
