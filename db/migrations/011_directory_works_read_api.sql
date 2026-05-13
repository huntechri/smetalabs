-- ============================================================================
-- Migration: 011_directory_works_read_api
-- Description: Ranked workspace-scoped read/search RPC for directory works.
-- Date: 2026-05-13
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_directory_works(
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
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH input AS (
    SELECT
      nullif(trim(coalesce(p_q, '')), '') AS raw_q,
      private.directory_work_normalize(p_q) AS normalized_q,
      CASE
        WHEN nullif(trim(coalesce(p_q, '')), '') IS NULL THEN NULL
        ELSE websearch_to_tsquery('simple', p_q)
      END AS query_fts,
      nullif(private.directory_work_normalize(p_category), '') AS normalized_category,
      nullif(private.directory_work_normalize(p_subcategory), '') AS normalized_subcategory,
      nullif(private.directory_work_normalize(p_unit), '') AS normalized_unit,
      coalesce(p_status, 'active'::public.directory_work_status) AS requested_status,
      least(greatest(coalesce(p_limit, 50), 1), 100) AS page_limit,
      greatest(coalesce(p_cursor, 0), 0) AS offset_rows,
      CASE
        WHEN p_sort IN ('updated_desc', 'title_asc') THEN p_sort
        ELSE 'relevance'
      END AS sort_key
  ),
  alias_rank AS (
    SELECT
      wa.workspace_owner_id,
      wa.work_id,
      array_agg(wa.alias ORDER BY wa.weight DESC, wa.alias ASC) AS aliases,
      bool_or(wa.normalized_alias = input.normalized_q) AS alias_exact,
      bool_or(wa.normalized_alias LIKE input.normalized_q || '%') AS alias_prefix,
      max(extensions.similarity(wa.normalized_alias, input.normalized_q)) AS alias_similarity
    FROM public.work_aliases wa
    CROSS JOIN input
    WHERE wa.workspace_owner_id = p_workspace_owner_id
      AND wa.deleted_at IS NULL
    GROUP BY wa.workspace_owner_id, wa.work_id
  ),
  keyword_rank AS (
    SELECT
      wk.workspace_owner_id,
      wk.work_id,
      array_agg(wk.keyword ORDER BY wk.weight DESC, wk.keyword ASC) AS keywords,
      bool_or(wk.normalized_keyword = input.normalized_q) AS keyword_exact,
      bool_or(wk.normalized_keyword LIKE input.normalized_q || '%') AS keyword_prefix,
      max(extensions.similarity(wk.normalized_keyword, input.normalized_q)) AS keyword_similarity
    FROM public.work_keywords wk
    CROSS JOIN input
    WHERE wk.workspace_owner_id = p_workspace_owner_id
      AND wk.deleted_at IS NULL
    GROUP BY wk.workspace_owner_id, wk.work_id
  ),
  matched AS (
    SELECT
      w.id,
      w.title,
      w.normalized_title,
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
      coalesce(ar.aliases, ARRAY[]::text[]) AS aliases,
      coalesce(kr.keywords, ARRAY[]::text[]) AS keywords,
      input.sort_key,
      (
        CASE
          WHEN input.raw_q IS NULL THEN 0
          ELSE
            CASE
              WHEN lower(coalesce(w.code, '')) = lower(input.raw_q)
                OR lower(coalesce(w.source_external_row_key, '')) = lower(input.raw_q)
              THEN 1000 ELSE 0
            END
            + CASE WHEN w.normalized_title = input.normalized_q THEN 800 ELSE 0 END
            + CASE WHEN w.normalized_title LIKE input.normalized_q || '%' THEN 600 ELSE 0 END
            + CASE WHEN coalesce(ar.alias_exact, false) THEN 500 ELSE 0 END
            + CASE WHEN coalesce(ar.alias_prefix, false) THEN 350 ELSE 0 END
            + CASE WHEN coalesce(kr.keyword_exact, false) THEN 250 ELSE 0 END
            + CASE WHEN coalesce(kr.keyword_prefix, false) THEN 175 ELSE 0 END
            + CASE
                WHEN input.query_fts IS NULL THEN 0
                ELSE (ts_rank_cd(w.search_fts, input.query_fts) * 120)
              END
            + (greatest(
                extensions.similarity(w.normalized_title, input.normalized_q),
                extensions.similarity(w.search_text, input.normalized_q),
                coalesce(ar.alias_similarity, 0),
                coalesce(kr.keyword_similarity, 0)
              ) * 90)
        END
        + CASE
            WHEN input.normalized_category IS NOT NULL
              AND private.directory_work_normalize(w.category) = input.normalized_category
            THEN 20 ELSE 0
          END
        + CASE
            WHEN input.normalized_subcategory IS NOT NULL
              AND private.directory_work_normalize(coalesce(w.subcategory, '')) = input.normalized_subcategory
            THEN 10 ELSE 0
          END
      )::double precision AS search_rank
    FROM public.directory_works w
    CROSS JOIN input
    LEFT JOIN alias_rank ar
      ON ar.workspace_owner_id = w.workspace_owner_id
     AND ar.work_id = w.id
    LEFT JOIN keyword_rank kr
      ON kr.workspace_owner_id = w.workspace_owner_id
     AND kr.work_id = w.id
    WHERE w.workspace_owner_id = p_workspace_owner_id
      AND w.deleted_at IS NULL
      AND w.status = input.requested_status
      AND (
        input.normalized_category IS NULL
        OR private.directory_work_normalize(w.category) = input.normalized_category
      )
      AND (
        input.normalized_subcategory IS NULL
        OR private.directory_work_normalize(coalesce(w.subcategory, '')) = input.normalized_subcategory
      )
      AND (
        input.normalized_unit IS NULL
        OR private.directory_work_normalize(w.unit_code) = input.normalized_unit
        OR private.directory_work_normalize(w.unit_label) = input.normalized_unit
      )
      AND (
        input.raw_q IS NULL
        OR lower(coalesce(w.code, '')) = lower(input.raw_q)
        OR lower(coalesce(w.source_external_row_key, '')) = lower(input.raw_q)
        OR w.normalized_title = input.normalized_q
        OR w.normalized_title LIKE input.normalized_q || '%'
        OR (input.query_fts IS NOT NULL AND w.search_fts @@ input.query_fts)
        OR extensions.similarity(w.normalized_title, input.normalized_q) >= 0.18
        OR extensions.similarity(w.search_text, input.normalized_q) >= 0.12
        OR coalesce(ar.alias_exact, false)
        OR coalesce(ar.alias_prefix, false)
        OR coalesce(ar.alias_similarity, 0) >= 0.18
        OR coalesce(kr.keyword_exact, false)
        OR coalesce(kr.keyword_prefix, false)
        OR coalesce(kr.keyword_similarity, 0) >= 0.18
      )
  ),
  ranked AS (
    SELECT matched.*, count(*) OVER () AS total_count
    FROM matched
  )
  SELECT
    ranked.id,
    ranked.title,
    ranked.unit_code,
    ranked.unit_label,
    ranked.rate_amount,
    ranked.currency_code,
    ranked.price_kind,
    ranked.category,
    ranked.subcategory,
    ranked.code,
    ranked.description,
    ranked.included_operations,
    ranked.excluded_operations,
    ranked.source_name,
    ranked.source_external_row_key,
    ranked.status,
    ranked.version,
    ranked.created_at,
    ranked.updated_at,
    ranked.aliases,
    ranked.keywords,
    ranked.search_rank,
    ranked.total_count
  FROM ranked
  ORDER BY
    CASE WHEN ranked.sort_key = 'updated_desc' THEN ranked.updated_at END DESC NULLS LAST,
    CASE WHEN ranked.sort_key = 'title_asc' THEN ranked.normalized_title END ASC NULLS LAST,
    CASE WHEN ranked.sort_key = 'relevance' THEN ranked.search_rank END DESC NULLS LAST,
    ranked.updated_at DESC,
    ranked.normalized_title ASC,
    ranked.id ASC
  LIMIT (SELECT page_limit + 1 FROM input)
  OFFSET (SELECT offset_rows FROM input);
$$;

CREATE OR REPLACE FUNCTION public.get_directory_work_detail(
  p_workspace_owner_id uuid,
  p_id uuid
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
  keywords text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
    coalesce(keyword_terms.keywords, ARRAY[]::text[]) AS keywords
  FROM public.directory_works w
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
  WHERE w.workspace_owner_id = p_workspace_owner_id
    AND w.id = p_id
    AND w.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_directory_work_categories(
  p_workspace_owner_id uuid,
  p_status public.directory_work_status DEFAULT 'active'
)
RETURNS TABLE (
  category text,
  subcategory text,
  unit_code text,
  unit_label text,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    w.category,
    w.subcategory,
    w.unit_code,
    w.unit_label,
    count(*)::bigint AS total_count
  FROM public.directory_works w
  WHERE w.workspace_owner_id = p_workspace_owner_id
    AND w.deleted_at IS NULL
    AND w.status = coalesce(p_status, 'active'::public.directory_work_status)
  GROUP BY w.category, w.subcategory, w.unit_code, w.unit_label
  ORDER BY w.category ASC, w.subcategory ASC NULLS FIRST, w.unit_label ASC, w.unit_code ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.search_directory_works(uuid, text, text, text, text, public.directory_work_status, integer, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_directory_work_detail(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_directory_work_categories(uuid, public.directory_work_status) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.search_directory_works(uuid, text, text, text, text, public.directory_work_status, integer, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_directory_work_detail(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_directory_work_categories(uuid, public.directory_work_status) TO service_role;
