-- ============================================================================
-- Migration: 018_directory_materials_ai_search
-- Description: Material-only hybrid AI search function over prepared embeddings.
-- Date: 2026-05-15
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_directory_materials_ai(
  p_workspace_owner_id uuid,
  p_query text,
  p_query_embedding vector(1536),
  p_category text DEFAULT NULL,
  p_subcategory text DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_threshold numeric DEFAULT 0.72
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
  source_name text,
  source_external_row_key text,
  status directory_material_status,
  version integer,
  created_at timestamptz,
  updated_at timestamptz,
  semantic_score numeric,
  text_score numeric,
  hybrid_score numeric,
  match_reason text
)
LANGUAGE sql
STABLE
AS $$
  WITH normalized AS (
    SELECT
      lower(btrim(coalesce(p_query, ''))) AS q,
      greatest(1, least(coalesce(p_limit, 20), 50)) AS result_limit,
      least(greatest(coalesce(p_threshold, 0.72), 0), 1) AS threshold
  ),
  ranked AS (
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
      m.source_name,
      m.source_external_row_key,
      m.status,
      m.version,
      m.created_at,
      m.updated_at,
      greatest(0, 1 - (e.embedding <=> p_query_embedding))::numeric AS semantic_score,
      CASE
        WHEN lower(coalesce(m.code, '')) = normalized.q THEN 1.00
        WHEN lower(coalesce(m.source_external_row_key, '')) = normalized.q THEN 0.98
        WHEN m.normalized_name = normalized.q THEN 0.95
        WHEN m.normalized_name LIKE normalized.q || '%' THEN 0.82
        WHEN lower(coalesce(m.supplier_name, '')) LIKE '%' || normalized.q || '%' THEN 0.58
        WHEN lower(coalesce(m.category, '')) LIKE '%' || normalized.q || '%' THEN 0.50
        WHEN lower(coalesce(m.subcategory, '')) LIKE '%' || normalized.q || '%' THEN 0.48
        WHEN m.search_text ILIKE '%' || normalized.q || '%' THEN 0.45
        ELSE 0
      END::numeric AS text_score
    FROM public.directory_materials m
    JOIN public.directory_material_embeddings e
      ON e.workspace_owner_id = m.workspace_owner_id
     AND e.material_id = m.id
     AND e.model_name = 'text-embedding-3-small'
     AND e.dimensions = 1536
     AND e.status = 'ready'
     AND e.embedding IS NOT NULL
    CROSS JOIN normalized
    WHERE m.workspace_owner_id = p_workspace_owner_id
      AND m.status = 'active'
      AND m.deleted_at IS NULL
      AND (p_category IS NULL OR m.category = p_category)
      AND (p_subcategory IS NULL OR m.subcategory = p_subcategory)
      AND (p_unit IS NULL OR m.unit_code = lower(btrim(p_unit)))
  ),
  hybrid AS (
    SELECT
      ranked.*,
      ((ranked.semantic_score * 0.68) + (ranked.text_score * 0.32))::numeric AS hybrid_score
    FROM ranked
  )
  SELECT
    hybrid.id,
    hybrid.name,
    hybrid.unit_code,
    hybrid.unit_label,
    hybrid.price_amount,
    hybrid.currency_code,
    hybrid.category,
    hybrid.subcategory,
    hybrid.code,
    hybrid.supplier_name,
    hybrid.supplier_id,
    hybrid.image_url,
    hybrid.description,
    hybrid.source_name,
    hybrid.source_external_row_key,
    hybrid.status,
    hybrid.version,
    hybrid.created_at,
    hybrid.updated_at,
    hybrid.semantic_score,
    hybrid.text_score,
    hybrid.hybrid_score,
    CASE
      WHEN hybrid.text_score >= 0.95 THEN 'Точное совпадение'
      WHEN hybrid.text_score >= 0.80 THEN 'Совпадение по названию'
      WHEN hybrid.semantic_score >= 0.86 THEN 'Близкий по смыслу материал'
      WHEN hybrid.text_score > 0 THEN 'Текстовое совпадение'
      ELSE 'Семантическое совпадение'
    END AS match_reason
  FROM hybrid
  CROSS JOIN normalized
  WHERE hybrid.semantic_score >= normalized.threshold OR hybrid.text_score > 0
  ORDER BY hybrid.hybrid_score DESC, hybrid.text_score DESC, hybrid.updated_at DESC, hybrid.id ASC
  LIMIT (SELECT result_limit FROM normalized);
$$;

REVOKE ALL ON FUNCTION public.search_directory_materials_ai(uuid, text, vector(1536), text, text, text, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_directory_materials_ai(uuid, text, vector(1536), text, text, text, integer, numeric) TO service_role;
