-- ============================================================================
-- Migration: 019_directory_works_manual_order
-- Description: Stable manual order for imported and manually inserted works.
-- Date: 2026-05-14
-- ============================================================================

ALTER TABLE public.directory_works
  ADD COLUMN IF NOT EXISTS sort_order numeric(20,6);

UPDATE public.directory_works w
SET sort_order = ordered.next_order
FROM (
  SELECT
    id,
    workspace_owner_id,
    row_number() OVER (
      PARTITION BY workspace_owner_id
      ORDER BY created_at DESC, id ASC
    ) * 1000 AS next_order
  FROM public.directory_works
  WHERE sort_order IS NULL
) ordered
WHERE w.id = ordered.id
  AND w.workspace_owner_id = ordered.workspace_owner_id
  AND w.sort_order IS NULL;

ALTER TABLE public.directory_works
  ALTER COLUMN sort_order SET DEFAULT 0,
  ALTER COLUMN sort_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_directory_works_workspace_sort_order
  ON public.directory_works(workspace_owner_id, status, deleted_at, sort_order, id);

CREATE OR REPLACE FUNCTION private.set_directory_work_imported_sort_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job_created_at timestamptz;
BEGIN
  IF NEW.applied_work_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.applied_work_id IS NOT DISTINCT FROM OLD.applied_work_id THEN
    RETURN NEW;
  END IF;

  SELECT j.created_at
    INTO v_job_created_at
  FROM public.directory_work_import_jobs j
  WHERE j.workspace_owner_id = NEW.workspace_owner_id
    AND j.id = NEW.job_id
  LIMIT 1;

  UPDATE public.directory_works w
  SET sort_order = -1 * (extract(epoch from coalesce(v_job_created_at, now()))::numeric * 1000) + NEW.row_number
  WHERE w.workspace_owner_id = NEW.workspace_owner_id
    AND w.id = NEW.applied_work_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_directory_work_import_rows_sort_order ON public.directory_work_import_rows;
CREATE TRIGGER trg_directory_work_import_rows_sort_order
  AFTER INSERT OR UPDATE OF applied_work_id
  ON public.directory_work_import_rows
  FOR EACH ROW
  EXECUTE FUNCTION private.set_directory_work_imported_sort_order();

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
  v_has_fast_match boolean := false;
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
      CASE WHEN v_sort = 'updated_desc' THEN w.updated_at END DESC NULLS LAST,
      CASE WHEN v_sort = 'relevance' THEN w.sort_order END ASC NULLS LAST,
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
    ORDER BY w.sort_order ASC, w.id ASC
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
        OR lower(coalesce(w.code, '')) LIKE v_raw_q_lower || '%'
        OR lower(coalesce(w.source_external_row_key, '')) LIKE v_raw_q_lower || '%'
        OR (v_query_fts IS NOT NULL AND w.search_fts @@ v_query_fts)
      )
    LIMIT 1
  ) INTO v_has_fast_match;

  RETURN QUERY
  WITH work_candidates AS (
    SELECT
      w.id AS work_id,
      (
        CASE WHEN w.normalized_title = v_normalized_q THEN 800 ELSE 0 END
        + CASE WHEN w.normalized_title LIKE v_normalized_q || '%' THEN 600 ELSE 0 END
        + CASE WHEN lower(coalesce(w.code, '')) LIKE v_raw_q_lower || '%' THEN 550 ELSE 0 END
        + CASE WHEN lower(coalesce(w.source_external_row_key, '')) LIKE v_raw_q_lower || '%' THEN 500 ELSE 0 END
        + CASE WHEN v_query_fts IS NOT NULL AND w.search_fts @@ v_query_fts THEN ts_rank_cd(w.search_fts, v_query_fts) * 120 ELSE 0 END
        + CASE WHEN NOT v_has_fast_match THEN greatest(
            extensions.similarity(w.normalized_title, v_normalized_q),
            extensions.similarity(w.search_text, v_normalized_q)
          ) * 90 ELSE 0 END
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
        OR lower(coalesce(w.code, '')) LIKE v_raw_q_lower || '%'
        OR lower(coalesce(w.source_external_row_key, '')) LIKE v_raw_q_lower || '%'
        OR (v_query_fts IS NOT NULL AND w.search_fts @@ v_query_fts)
        OR (
          NOT v_has_fast_match
          AND (
            extensions.similarity(w.normalized_title, v_normalized_q) >= 0.18
            OR extensions.similarity(w.search_text, v_normalized_q) >= 0.12
          )
        )
      )
  ), candidate_ids AS (
    SELECT work_candidates.work_id, max(work_candidates.candidate_rank) AS candidate_rank
    FROM work_candidates
    GROUP BY work_candidates.work_id
  ), ranked AS (
    SELECT
      w.*,
      ARRAY[]::text[] AS aliases,
      ARRAY[]::text[] AS keywords,
      c.candidate_rank::double precision AS search_rank,
      count(*) OVER () AS total_count
    FROM candidate_ids c
    JOIN public.directory_works w
      ON w.id = c.work_id
     AND w.workspace_owner_id = p_workspace_owner_id
     AND w.deleted_at IS NULL
     AND w.status = v_status
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
    ranked.sort_order ASC,
    ranked.normalized_title ASC,
    ranked.id ASC
  LIMIT v_limit + 1
  OFFSET v_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_directory_works(uuid, text, text, text, text, public.directory_work_status, integer, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_directory_works(uuid, text, text, text, text, public.directory_work_status, integer, integer, text) TO service_role;
