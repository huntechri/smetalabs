-- ============================================================================
-- Migration: 054_directory_materials_search_rpc
-- Description: Unified search function for materials with FTS, trigrams and code exact match.
-- Date: 2026-06-02
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_directory_materials(
  p_workspace_owner_id uuid,
  p_q text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_subcategory text DEFAULT NULL,
  p_supplier text DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_status public.directory_material_status DEFAULT 'active',
  p_limit integer DEFAULT 50,
  p_cursor integer DEFAULT 0,
  p_sort text DEFAULT 'relevance'
)
RETURNS TABLE (
  id uuid,
  name text,
  unit_code text,
  unit_label text,
  price_amount numeric,
  currency_code varchar,
  category text,
  subcategory text,
  code text,
  supplier_name text,
  supplier_id uuid,
  image_url text,
  description text,
  aliases text[],
  keywords text[],
  source_name text,
  source_external_row_key text,
  status public.directory_material_status,
  version integer,
  created_at timestamptz,
  updated_at timestamptz,
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
  v_normalized_q text := nullif(lower(trim(coalesce(p_q, ''))), '');
  v_raw_q_lower text := lower(nullif(trim(coalesce(p_q, '')), ''));
  v_query_fts tsquery := NULL;
  v_category text := nullif(trim(coalesce(p_category, '')), '');
  v_subcategory text := nullif(trim(coalesce(p_subcategory, '')), '');
  v_supplier text := nullif(trim(coalesce(p_supplier, '')), '');
  v_unit text := nullif(trim(coalesce(p_unit, '')), '');
  v_status public.directory_material_status := coalesce(p_status, 'active'::public.directory_material_status);
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_cursor, 0), 0);
  v_sort text := CASE WHEN p_sort IN ('updated_desc', 'name_asc') THEN p_sort ELSE 'relevance' END;
  v_has_exact_match boolean := false;
  v_has_fast_match boolean := false;
BEGIN
  IF v_raw_q IS NOT NULL THEN
    v_query_fts := websearch_to_tsquery('simple', v_raw_q);
  END IF;

  IF v_raw_q IS NULL THEN
    RETURN QUERY
    SELECT
      m.id,
      m.name,
      m.unit_code,
      m.unit_label,
      m.price_amount,
      m.currency_code,
      m.category,
      m.subcategory,
      m.code,
      m.supplier_name,
      m.supplier_id,
      m.image_url,
      m.description,
      m.aliases,
      m.keywords,
      m.source_name,
      m.source_external_row_key,
      m.status,
      m.version,
      m.created_at,
      m.updated_at,
      0::double precision AS search_rank,
      NULL::bigint AS total_count
    FROM public.directory_materials m
    WHERE m.workspace_owner_id = p_workspace_owner_id
      AND m.deleted_at IS NULL
      AND m.status = v_status
      AND (v_category IS NULL OR m.category = v_category)
      AND (v_subcategory IS NULL OR m.subcategory = v_subcategory)
      AND (v_supplier IS NULL OR m.supplier_name = v_supplier)
      AND (
        v_unit IS NULL
        OR m.unit_code = lower(v_unit)
        OR m.unit_label = v_unit
      )
    ORDER BY
      CASE WHEN v_sort = 'name_asc' THEN m.normalized_name END ASC NULLS LAST,
      CASE WHEN v_sort = 'updated_desc' THEN m.updated_at END DESC NULLS LAST,
      m.id ASC
    LIMIT v_limit + 1
    OFFSET v_offset;

    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.directory_materials m
    WHERE m.workspace_owner_id = p_workspace_owner_id
      AND m.deleted_at IS NULL
      AND m.status = v_status
      AND (
        (m.code IS NOT NULL AND lower(m.code) = v_raw_q_lower)
        OR (m.source_external_row_key IS NOT NULL AND lower(m.source_external_row_key) = v_raw_q_lower)
      )
      AND (v_category IS NULL OR m.category = v_category)
      AND (v_subcategory IS NULL OR m.subcategory = v_subcategory)
      AND (v_supplier IS NULL OR m.supplier_name = v_supplier)
      AND (
        v_unit IS NULL
        OR m.unit_code = lower(v_unit)
        OR m.unit_label = v_unit
      )
  ) INTO v_has_exact_match;

  IF v_has_exact_match THEN
    RETURN QUERY
    WITH exact_rows AS (
      SELECT m.*
      FROM public.directory_materials m
      WHERE m.workspace_owner_id = p_workspace_owner_id
        AND m.deleted_at IS NULL
        AND m.status = v_status
        AND (
          (m.code IS NOT NULL AND lower(m.code) = v_raw_q_lower)
          OR (m.source_external_row_key IS NOT NULL AND lower(m.source_external_row_key) = v_raw_q_lower)
        )
        AND (v_category IS NULL OR m.category = v_category)
        AND (v_subcategory IS NULL OR m.subcategory = v_subcategory)
        AND (v_supplier IS NULL OR m.supplier_name = v_supplier)
        AND (
          v_unit IS NULL
          OR m.unit_code = lower(v_unit)
          OR m.unit_label = v_unit
        )
    ), counted AS (
      SELECT exact_rows.*, count(*) OVER () AS total_count
      FROM exact_rows
    )
    SELECT
      m.id,
      m.name,
      m.unit_code,
      m.unit_label,
      m.price_amount,
      m.currency_code,
      m.category,
      m.subcategory,
      m.code,
      m.supplier_name,
      m.supplier_id,
      m.image_url,
      m.description,
      m.aliases,
      m.keywords,
      m.source_name,
      m.source_external_row_key,
      m.status,
      m.version,
      m.created_at,
      m.updated_at,
      1000::double precision AS search_rank,
      m.total_count
    FROM counted m
    ORDER BY m.normalized_name ASC, m.id ASC
    LIMIT v_limit + 1
    OFFSET v_offset;

    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.directory_materials m
    WHERE m.workspace_owner_id = p_workspace_owner_id
      AND m.deleted_at IS NULL
      AND m.status = v_status
      AND (v_category IS NULL OR m.category = v_category)
      AND (v_subcategory IS NULL OR m.subcategory = v_subcategory)
      AND (v_supplier IS NULL OR m.supplier_name = v_supplier)
      AND (
        v_unit IS NULL
        OR m.unit_code = lower(v_unit)
        OR m.unit_label = v_unit
      )
      AND (
        m.normalized_name = v_normalized_q
        OR m.normalized_name LIKE v_normalized_q || '%'
        OR lower(coalesce(m.code, '')) LIKE v_raw_q_lower || '%'
        OR lower(coalesce(m.source_external_row_key, '')) LIKE v_raw_q_lower || '%'
        OR (v_query_fts IS NOT NULL AND m.search_fts @@ v_query_fts)
      )
    LIMIT 1
  ) INTO v_has_fast_match;

  RETURN QUERY
  WITH material_candidates AS (
    SELECT
      m.id AS material_id,
      (
        CASE WHEN m.normalized_name = v_normalized_q THEN 800 ELSE 0 END
        + CASE WHEN m.normalized_name LIKE v_normalized_q || '%' THEN 600 ELSE 0 END
        + CASE WHEN lower(coalesce(m.code, '')) LIKE v_raw_q_lower || '%' THEN 550 ELSE 0 END
        + CASE WHEN lower(coalesce(m.source_external_row_key, '')) LIKE v_raw_q_lower || '%' THEN 500 ELSE 0 END
        + CASE WHEN v_query_fts IS NOT NULL AND m.search_fts @@ v_query_fts THEN ts_rank_cd(m.search_fts, v_query_fts) * 120 ELSE 0 END
        + CASE WHEN NOT v_has_fast_match THEN greatest(
            extensions.similarity(m.normalized_name, v_normalized_q),
            extensions.similarity(m.search_text, v_normalized_q)
          ) * 90 ELSE 0 END
      )::double precision AS candidate_rank
    FROM public.directory_materials m
    WHERE m.workspace_owner_id = p_workspace_owner_id
      AND m.deleted_at IS NULL
      AND m.status = v_status
      AND (v_category IS NULL OR m.category = v_category)
      AND (v_subcategory IS NULL OR m.subcategory = v_subcategory)
      AND (v_supplier IS NULL OR m.supplier_name = v_supplier)
      AND (
        v_unit IS NULL
        OR m.unit_code = lower(v_unit)
        OR m.unit_label = v_unit
      )
      AND (
        m.normalized_name = v_normalized_q
        OR m.normalized_name LIKE v_normalized_q || '%'
        OR lower(coalesce(m.code, '')) LIKE v_raw_q_lower || '%'
        OR lower(coalesce(m.source_external_row_key, '')) LIKE v_raw_q_lower || '%'
        OR (v_query_fts IS NOT NULL AND m.search_fts @@ v_query_fts)
        OR (
          NOT v_has_fast_match
          AND (
            extensions.similarity(m.normalized_name, v_normalized_q) >= 0.18
            OR extensions.similarity(m.search_text, v_normalized_q) >= 0.12
          )
        )
      )
  ), candidate_ids AS (
    SELECT material_candidates.material_id, max(material_candidates.candidate_rank) AS candidate_rank
    FROM material_candidates
    GROUP BY material_candidates.material_id
  ), ranked AS (
    SELECT
      m.*,
      c.candidate_rank::double precision AS search_rank,
      count(*) OVER () AS total_count
    FROM candidate_ids c
    JOIN public.directory_materials m
      ON m.id = c.material_id
     AND m.workspace_owner_id = p_workspace_owner_id
     AND m.deleted_at IS NULL
     AND m.status = v_status
  )
  SELECT
    ranked.id,
    ranked.name,
    ranked.unit_code,
    ranked.unit_label,
    ranked.price_amount,
    ranked.currency_code,
    ranked.category,
    ranked.subcategory,
    ranked.code,
    ranked.supplier_name,
    ranked.supplier_id,
    ranked.image_url,
    ranked.description,
    ranked.aliases,
    ranked.keywords,
    ranked.source_name,
    ranked.source_external_row_key,
    ranked.status,
    ranked.version,
    ranked.created_at,
    ranked.updated_at,
    ranked.search_rank,
    ranked.total_count
  FROM ranked
  ORDER BY
    ranked.search_rank DESC,
    ranked.normalized_name ASC,
    ranked.id ASC
  LIMIT v_limit + 1
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.search_directory_materials(uuid, text, text, text, text, text, public.directory_material_status, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_directory_materials(uuid, text, text, text, text, text, public.directory_material_status, integer, integer, text) TO service_role;
