-- ============================================================================
-- Migration: 017_fix_directory_works_search_ambiguous_id
-- Description: Recreate search_directory_works with unambiguous candidate ids.
-- Date: 2026-05-14
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_raw_q text := nullif(trim(coalesce(p_q, '')), '');
  v_normalized_q text := nullif(private.directory_work_normalize(p_q), '');
  v_raw_q_lower text := lower(nullif(trim(coalesce(p_q, '')), ''));
  v_query_fts tsquery := NULL;
  v_category text := nullif(private.directory_work_normalize(p_category), '');
  v_subcategory text := nullif(private.directory_work_normalize(p_subcategory), '');
  v_unit text := nullif(private.directory_work_normalize(p_unit), '');
  v_status public.directory_work_status := coalesce(p_status, 'active'::public.directory_work_status);
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_cursor, 0), 0);
  v_sort text := CASE WHEN p_sort IN ('updated_desc', 'title_asc') THEN p_sort ELSE 'relevance' END;
  v_has_exact_match boolean := false;
BEGIN
  IF v_raw_q IS NOT NULL THEN
    v_query_fts := websearch_to_tsquery('simple', v_raw_q);
  END IF;

  IF v_raw_q IS NULL THEN
    RETURN QUERY
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
      ARRAY[]::text[] AS aliases,
      ARRAY[]::text[] AS keywords,
      0::double precision AS search_rank,
      NULL::bigint AS total_count
    FROM public.directory_works w
    WHERE w.workspace_owner_id = p_workspace_owner_id
      AND w.deleted_at IS NULL
      AND w.status = v_status
      AND (v_category IS NULL OR private.directory_work_normalize(w.category) = v_category)
      AND (v_subcategory IS NULL OR private.directory_work_normalize(coalesce(w.subcategory, '')) = v_subcategory)
      AND (
        v_unit IS NULL
        OR private.directory_work_normalize(w.unit_code) = v_unit
        OR private.directory_work_normalize(w.unit_label) = v_unit
      )
    ORDER BY
      CASE WHEN v_sort = 'title_asc' THEN w.normalized_title END ASC NULLS LAST,
      CASE WHEN v_sort = 'updated_desc' OR v_sort = 'relevance' THEN w.updated_at END DESC NULLS LAST,
      w.id ASC
    LIMIT v_limit + 1
    OFFSET v_offset;

    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.directory_works w
    WHERE w.workspace_owner_id = p_workspace_owner_id
      AND w.deleted_at IS NULL
      AND w.status = v_status
      AND (
        (w.code IS NOT NULL AND lower(w.code) = v_raw_q_lower)
        OR (w.source_external_row_key IS NOT NULL AND lower(w.source_external_row_key) = v_raw_q_lower)
      )
      AND (v_category IS NULL OR private.directory_work_normalize(w.category) = v_category)
      AND (v_subcategory IS NULL OR private.directory_work_normalize(coalesce(w.subcategory, '')) = v_subcategory)
      AND (
        v_unit IS NULL
        OR private.directory_work_normalize(w.unit_code) = v_unit
        OR private.directory_work_normalize(w.unit_label) = v_unit
      )
  ) INTO v_has_exact_match;

  IF v_has_exact_match THEN
    RETURN QUERY
    WITH exact_rows AS (
      SELECT w.*
      FROM public.directory_works w
      WHERE w.workspace_owner_id = p_workspace_owner_id
        AND w.deleted_at IS NULL
        AND w.status = v_status
        AND (
          (w.code IS NOT NULL AND lower(w.code) = v_raw_q_lower)
          OR (w.source_external_row_key IS NOT NULL AND lower(w.source_external_row_key) = v_raw_q_lower)
        )
        AND (v_category IS NULL OR private.directory_work_normalize(w.category) = v_category)
        AND (v_subcategory IS NULL OR private.directory_work_normalize(coalesce(w.subcategory, '')) = v_subcategory)
        AND (
          v_unit IS NULL
          OR private.directory_work_normalize(w.unit_code) = v_unit
          OR private.directory_work_normalize(w.unit_label) = v_unit
        )
    ), counted AS (
      SELECT exact_rows.*, count(*) OVER () AS total_count
      FROM exact_rows
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
      1000::double precision AS search_rank,
      w.total_count
    FROM counted w
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
    ORDER BY w.updated_at DESC, w.id ASC
    LIMIT v_limit + 1
    OFFSET v_offset;

    RETURN;
  END IF;

  RETURN QUERY
  WITH work_candidates AS (
    SELECT
      w.id AS work_id,
      (
        CASE WHEN w.normalized_title = v_normalized_q THEN 800 ELSE 0 END
        + CASE WHEN w.normalized_title LIKE v_normalized_q || '%' THEN 600 ELSE 0 END
        + CASE WHEN v_query_fts IS NOT NULL AND w.search_fts @@ v_query_fts THEN ts_rank_cd(w.search_fts, v_query_fts) * 120 ELSE 0 END
        + greatest(
            extensions.similarity(w.normalized_title, v_normalized_q),
            extensions.similarity(w.search_text, v_normalized_q)
          ) * 90
      )::double precision AS candidate_rank
    FROM public.directory_works w
    WHERE w.workspace_owner_id = p_workspace_owner_id
      AND w.deleted_at IS NULL
      AND w.status = v_status
      AND (v_category IS NULL OR private.directory_work_normalize(w.category) = v_category)
      AND (v_subcategory IS NULL OR private.directory_work_normalize(coalesce(w.subcategory, '')) = v_subcategory)
      AND (
        v_unit IS NULL
        OR private.directory_work_normalize(w.unit_code) = v_unit
        OR private.directory_work_normalize(w.unit_label) = v_unit
      )
      AND (
        w.normalized_title = v_normalized_q
        OR w.normalized_title LIKE v_normalized_q || '%'
        OR (v_query_fts IS NOT NULL AND w.search_fts @@ v_query_fts)
        OR extensions.similarity(w.normalized_title, v_normalized_q) >= 0.18
        OR extensions.similarity(w.search_text, v_normalized_q) >= 0.12
      )
    ORDER BY candidate_rank DESC, w.updated_at DESC, w.id ASC
    LIMIT 1200
  ), alias_candidates AS (
    SELECT
      wa.work_id AS work_id,
      max((
        CASE WHEN wa.normalized_alias = v_normalized_q THEN 500 ELSE 0 END
        + CASE WHEN wa.normalized_alias LIKE v_normalized_q || '%' THEN 350 ELSE 0 END
        + extensions.similarity(wa.normalized_alias, v_normalized_q) * 90
      )::double precision) AS candidate_rank
    FROM public.work_aliases wa
    JOIN public.directory_works w
      ON w.id = wa.work_id
     AND w.workspace_owner_id = p_workspace_owner_id
     AND w.deleted_at IS NULL
     AND w.status = v_status
     AND (v_category IS NULL OR private.directory_work_normalize(w.category) = v_category)
     AND (v_subcategory IS NULL OR private.directory_work_normalize(coalesce(w.subcategory, '')) = v_subcategory)
     AND (
       v_unit IS NULL
       OR private.directory_work_normalize(w.unit_code) = v_unit
       OR private.directory_work_normalize(w.unit_label) = v_unit
     )
    WHERE wa.workspace_owner_id = p_workspace_owner_id
      AND wa.deleted_at IS NULL
      AND (
        wa.normalized_alias = v_normalized_q
        OR wa.normalized_alias LIKE v_normalized_q || '%'
        OR extensions.similarity(wa.normalized_alias, v_normalized_q) >= 0.18
      )
    GROUP BY wa.work_id
    ORDER BY candidate_rank DESC, wa.work_id ASC
    LIMIT 500
  ), keyword_candidates AS (
    SELECT
      wk.work_id AS work_id,
      max((
        CASE WHEN wk.normalized_keyword = v_normalized_q THEN 250 ELSE 0 END
        + CASE WHEN wk.normalized_keyword LIKE v_normalized_q || '%' THEN 175 ELSE 0 END
        + extensions.similarity(wk.normalized_keyword, v_normalized_q) * 90
      )::double precision) AS candidate_rank
    FROM public.work_keywords wk
    JOIN public.directory_works w
      ON w.id = wk.work_id
     AND w.workspace_owner_id = p_workspace_owner_id
     AND w.deleted_at IS NULL
     AND w.status = v_status
     AND (v_category IS NULL OR private.directory_work_normalize(w.category) = v_category)
     AND (v_subcategory IS NULL OR private.directory_work_normalize(coalesce(w.subcategory, '')) = v_subcategory)
     AND (
       v_unit IS NULL
       OR private.directory_work_normalize(w.unit_code) = v_unit
       OR private.directory_work_normalize(w.unit_label) = v_unit
     )
    WHERE wk.workspace_owner_id = p_workspace_owner_id
      AND wk.deleted_at IS NULL
      AND (
        wk.normalized_keyword = v_normalized_q
        OR wk.normalized_keyword LIKE v_normalized_q || '%'
        OR extensions.similarity(wk.normalized_keyword, v_normalized_q) >= 0.18
      )
    GROUP BY wk.work_id
    ORDER BY candidate_rank DESC, wk.work_id ASC
    LIMIT 500
  ), candidate_ids AS (
    SELECT candidates.work_id, max(candidates.candidate_rank) AS candidate_rank
    FROM (
      SELECT * FROM work_candidates
      UNION ALL
      SELECT * FROM alias_candidates
      UNION ALL
      SELECT * FROM keyword_candidates
    ) candidates
    GROUP BY candidates.work_id
  ), ranked AS (
    SELECT
      w.*,
      coalesce(alias_terms.aliases, ARRAY[]::text[]) AS aliases,
      coalesce(keyword_terms.keywords, ARRAY[]::text[]) AS keywords,
      (
        c.candidate_rank
        + CASE WHEN coalesce(alias_terms.alias_exact, false) THEN 500 ELSE 0 END
        + CASE WHEN coalesce(alias_terms.alias_prefix, false) THEN 350 ELSE 0 END
        + CASE WHEN coalesce(keyword_terms.keyword_exact, false) THEN 250 ELSE 0 END
        + CASE WHEN coalesce(keyword_terms.keyword_prefix, false) THEN 175 ELSE 0 END
        + CASE WHEN v_category IS NOT NULL THEN 20 ELSE 0 END
        + CASE WHEN v_subcategory IS NOT NULL THEN 10 ELSE 0 END
      )::double precision AS search_rank,
      count(*) OVER () AS total_count
    FROM candidate_ids c
    JOIN public.directory_works w
      ON w.id = c.work_id
     AND w.workspace_owner_id = p_workspace_owner_id
     AND w.deleted_at IS NULL
     AND w.status = v_status
    LEFT JOIN LATERAL (
      SELECT
        array_agg(wa.alias ORDER BY wa.weight DESC, wa.alias ASC) AS aliases,
        bool_or(wa.normalized_alias = v_normalized_q) AS alias_exact,
        bool_or(wa.normalized_alias LIKE v_normalized_q || '%') AS alias_prefix
      FROM public.work_aliases wa
      WHERE wa.workspace_owner_id = w.workspace_owner_id
        AND wa.work_id = w.id
        AND wa.deleted_at IS NULL
    ) alias_terms ON true
    LEFT JOIN LATERAL (
      SELECT
        array_agg(wk.keyword ORDER BY wk.weight DESC, wk.keyword ASC) AS keywords,
        bool_or(wk.normalized_keyword = v_normalized_q) AS keyword_exact,
        bool_or(wk.normalized_keyword LIKE v_normalized_q || '%') AS keyword_prefix
      FROM public.work_keywords wk
      WHERE wk.workspace_owner_id = w.workspace_owner_id
        AND wk.work_id = w.id
        AND wk.deleted_at IS NULL
    ) keyword_terms ON true
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
    ranked.search_rank DESC,
    ranked.updated_at DESC,
    ranked.normalized_title ASC,
    ranked.id ASC
  LIMIT v_limit + 1
  OFFSET v_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_directory_works(uuid, text, text, text, text, public.directory_work_status, integer, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_directory_works(uuid, text, text, text, text, public.directory_work_status, integer, integer, text) TO service_role;
