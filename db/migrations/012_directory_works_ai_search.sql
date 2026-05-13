-- ============================================================================
-- Migration: 012_directory_works_ai_search
-- Description: Hybrid semantic/text search RPC for workspace-scoped directory works.
-- Date: 2026-05-13
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_directory_work_embeddings_ready_model
  ON public.directory_work_embeddings(workspace_owner_id, model_name, dimensions, status, updated_at)
  WHERE status = 'ready';

CREATE INDEX IF NOT EXISTS idx_directory_work_embeddings_ready_vector_cosine_1536
  ON public.directory_work_embeddings
  USING hnsw ((embedding::extensions.vector(1536)) extensions.vector_cosine_ops)
  WHERE status = 'ready'
    AND model_name = 'text-embedding-3-small'
    AND dimensions = 1536
    AND embedding IS NOT NULL;

CREATE OR REPLACE FUNCTION public.hybrid_search_directory_works(
  p_workspace_owner_id uuid,
  p_q text,
  p_query_embedding extensions.vector(1536),
  p_category text DEFAULT NULL,
  p_subcategory text DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_threshold double precision DEFAULT 0.72,
  p_model_name text DEFAULT 'text-embedding-3-small',
  p_dimensions integer DEFAULT 1536
)
RETURNS TABLE (
  id uuid,
  title text,
  unit_code text,
  unit_label text,
  rate_amount numeric,
  currency_code varchar,
  price_kind public.directory_work_price_kind,
  category text,
  subcategory text,
  code text,
  description text,
  included_operations text,
  excluded_operations text,
  source_name text,
  source_external_row_key text,
  status public.directory_work_status,
  version integer,
  created_at timestamptz,
  updated_at timestamptz,
  aliases text[],
  keywords text[],
  search_rank double precision,
  total_count bigint,
  semantic_score double precision,
  text_score double precision,
  hybrid_score double precision,
  match_reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH input AS (
    SELECT
      nullif(trim(coalesce(p_q, '')), '') AS raw_q,
      least(greatest(coalesce(p_limit, 20), 1), 50) AS page_limit,
      greatest(least(coalesce(p_threshold, 0.72), 1), 0) AS threshold_value,
      coalesce(p_model_name, 'text-embedding-3-small') AS requested_model,
      coalesce(p_dimensions, 1536) AS requested_dimensions
  ),
  text_matches AS (
    SELECT
      t.id,
      t.search_rank AS text_score,
      row_number() OVER (ORDER BY t.search_rank DESC, t.updated_at DESC) AS text_rank
    FROM public.search_directory_works(
      p_workspace_owner_id,
      p_q,
      p_category,
      p_subcategory,
      p_unit,
      'active'::public.directory_work_status,
      50,
      0,
      'relevance'
    ) t
  ),
  semantic_matches AS (
    SELECT
      e.work_id AS id,
      (1 - (e.embedding::extensions.vector(1536) OPERATOR(extensions.<=>) p_query_embedding))::double precision AS semantic_score,
      row_number() OVER (
        ORDER BY e.embedding::extensions.vector(1536) OPERATOR(extensions.<=>) p_query_embedding ASC
      ) AS semantic_rank
    FROM public.directory_work_embeddings e
    JOIN public.directory_works w
      ON w.workspace_owner_id = e.workspace_owner_id
     AND w.id = e.work_id
    CROSS JOIN input
    WHERE e.workspace_owner_id = p_workspace_owner_id
      AND e.model_name = input.requested_model
      AND e.dimensions = input.requested_dimensions
      AND e.status = 'ready'
      AND e.embedding IS NOT NULL
      AND w.status = 'active'
      AND w.deleted_at IS NULL
      AND (
        p_category IS NULL
        OR private.directory_work_normalize(w.category) = private.directory_work_normalize(p_category)
      )
      AND (
        p_subcategory IS NULL
        OR private.directory_work_normalize(coalesce(w.subcategory, '')) = private.directory_work_normalize(p_subcategory)
      )
      AND (
        p_unit IS NULL
        OR private.directory_work_normalize(w.unit_code) = private.directory_work_normalize(p_unit)
        OR private.directory_work_normalize(w.unit_label) = private.directory_work_normalize(p_unit)
      )
      AND (1 - (e.embedding::extensions.vector(1536) OPERATOR(extensions.<=>) p_query_embedding)) >= input.threshold_value
    ORDER BY e.embedding::extensions.vector(1536) OPERATOR(extensions.<=>) p_query_embedding ASC
    LIMIT 50
  ),
  combined AS (
    SELECT
      coalesce(tm.id, sm.id) AS id,
      tm.text_score,
      sm.semantic_score,
      CASE
        WHEN tm.text_score >= 800 THEN 'exact_text'
        WHEN tm.text_score IS NOT NULL AND sm.semantic_score IS NOT NULL THEN 'hybrid_match'
        WHEN tm.text_score IS NOT NULL THEN 'text_match'
        ELSE 'semantic_match'
      END AS match_reason,
      (
        CASE
          WHEN tm.text_score >= 800 THEN 1.0
          WHEN tm.text_score IS NOT NULL THEN least(tm.text_score / 1000.0, 0.95) * 0.7
          ELSE 0
        END
        +
        CASE
          WHEN sm.semantic_score IS NOT NULL THEN sm.semantic_score * 0.3
          ELSE 0
        END
        +
        CASE
          WHEN tm.text_score >= 800 THEN 0.5
          WHEN tm.text_score IS NOT NULL AND sm.semantic_score IS NOT NULL THEN 0.15
          ELSE 0
        END
      )::double precision AS hybrid_score
    FROM text_matches tm
    FULL OUTER JOIN semantic_matches sm ON sm.id = tm.id
  ),
  ranked AS (
    SELECT
      c.*,
      count(*) OVER () AS total_count
    FROM combined c
    WHERE c.id IS NOT NULL
  )
  SELECT
    w.id,
    w.title,
    w.unit_code,
    w.unit_label,
    w.rate_amount,
    w.currency_code,
    w.price_kind,
    w.category,
    w.subcategory,
    w.code,
    w.description,
    w.included_operations,
    w.excluded_operations,
    w.source_name,
    w.source_external_row_key,
    w.status,
    w.version,
    w.created_at,
    w.updated_at,
    coalesce(alias_terms.aliases, ARRAY[]::text[]) AS aliases,
    coalesce(keyword_terms.keywords, ARRAY[]::text[]) AS keywords,
    ranked.text_score AS search_rank,
    ranked.total_count,
    ranked.semantic_score,
    ranked.text_score,
    ranked.hybrid_score,
    ranked.match_reason
  FROM ranked
  JOIN public.directory_works w
    ON w.workspace_owner_id = p_workspace_owner_id
   AND w.id = ranked.id
  LEFT JOIN LATERAL (
    SELECT array_agg(wa.alias ORDER BY wa.weight DESC, wa.alias ASC) AS aliases
    FROM public.work_aliases wa
    WHERE wa.workspace_owner_id = w.workspace_owner_id
      AND wa.work_id = w.id
      AND wa.deleted_at IS NULL
  ) alias_terms ON true
  LEFT JOIN LATERAL (
    SELECT array_agg(wk.keyword ORDER BY wk.weight DESC, wk.keyword ASC) AS keywords
    FROM public.work_keywords wk
    WHERE wk.workspace_owner_id = w.workspace_owner_id
      AND wk.work_id = w.id
      AND wk.deleted_at IS NULL
  ) keyword_terms ON true
  WHERE w.deleted_at IS NULL
    AND w.status = 'active'
  ORDER BY
    CASE WHEN ranked.match_reason = 'exact_text' THEN 0 ELSE 1 END,
    ranked.hybrid_score DESC,
    ranked.text_score DESC NULLS LAST,
    ranked.semantic_score DESC NULLS LAST,
    w.updated_at DESC
  LIMIT (SELECT page_limit FROM input);
$$;

REVOKE EXECUTE ON FUNCTION public.hybrid_search_directory_works(uuid, text, extensions.vector(1536), text, text, text, integer, double precision, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hybrid_search_directory_works(uuid, text, extensions.vector(1536), text, text, text, integer, double precision, text, integer) TO service_role;
