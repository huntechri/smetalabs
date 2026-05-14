-- ============================================================================
-- Migration: 015_directory_work_update_rpc
-- Description: Single-round-trip RPC for directory work update and embedding enqueue.
-- Date: 2026-05-14
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_directory_work_with_embedding(
  p_workspace_owner_id uuid,
  p_user_id uuid,
  p_id uuid,
  p_title text,
  p_unit text,
  p_rate numeric,
  p_category text,
  p_subcategory text DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_included_operations text DEFAULT NULL,
  p_excluded_operations text DEFAULT NULL,
  p_source_name text DEFAULT NULL,
  p_source_external_row_key text DEFAULT NULL,
  p_currency_code varchar DEFAULT 'RUB',
  p_price_kind public.directory_work_price_kind DEFAULT 'base'::public.directory_work_price_kind,
  p_enqueue_embedding boolean DEFAULT true
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing_version integer;
  v_work public.directory_works%ROWTYPE;
  v_title text := regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g');
  v_unit_label text := regexp_replace(trim(coalesce(p_unit, '')), '\s+', ' ', 'g');
  v_unit_code text;
  v_category text := regexp_replace(trim(coalesce(p_category, '')), '\s+', ' ', 'g');
  v_subcategory text := nullif(trim(coalesce(p_subcategory, '')), '');
  v_code text := nullif(trim(coalesce(p_code, '')), '');
  v_description text := nullif(trim(coalesce(p_description, '')), '');
  v_included_operations text := nullif(trim(coalesce(p_included_operations, '')), '');
  v_excluded_operations text := nullif(trim(coalesce(p_excluded_operations, '')), '');
  v_source_name text := nullif(trim(coalesce(p_source_name, '')), '');
  v_source_external_row_key text := nullif(trim(coalesce(p_source_external_row_key, '')), '');
  v_currency_code varchar := upper(coalesce(nullif(trim(p_currency_code), ''), 'RUB'));
  v_price_kind public.directory_work_price_kind := coalesce(p_price_kind, 'base'::public.directory_work_price_kind);
  v_aliases text[] := ARRAY[]::text[];
  v_keywords text[] := ARRAY[]::text[];
  v_embedding_input_text text;
  v_content_hash text;
BEGIN
  IF v_title = '' THEN
    RAISE EXCEPTION 'DIRECTORY_WORK_TITLE_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_unit_label = '' THEN
    RAISE EXCEPTION 'DIRECTORY_WORK_UNIT_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_category = '' THEN
    RAISE EXCEPTION 'DIRECTORY_WORK_CATEGORY_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_rate IS NULL OR p_rate < 0 THEN
    RAISE EXCEPTION 'DIRECTORY_WORK_RATE_INVALID' USING ERRCODE = '22023';
  END IF;

  v_unit_code := regexp_replace(lower(v_unit_label), '\s+', '_', 'g');

  SELECT w.version
    INTO v_existing_version
  FROM public.directory_works w
  WHERE w.workspace_owner_id = p_workspace_owner_id
    AND w.id = p_id
    AND w.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_code IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.directory_works w
    WHERE w.workspace_owner_id = p_workspace_owner_id
      AND w.code = v_code
      AND w.id <> p_id
      AND w.deleted_at IS NULL
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'DIRECTORY_WORK_CODE_DUPLICATE' USING ERRCODE = '23505';
  END IF;

  IF v_source_name IS NOT NULL
    AND v_source_external_row_key IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.directory_works w
      WHERE w.workspace_owner_id = p_workspace_owner_id
        AND w.source_name = v_source_name
        AND w.source_external_row_key = v_source_external_row_key
        AND w.id <> p_id
        AND w.deleted_at IS NULL
      LIMIT 1
    )
  THEN
    RAISE EXCEPTION 'DIRECTORY_WORK_SOURCE_DUPLICATE' USING ERRCODE = '23505';
  END IF;

  UPDATE public.directory_works w
  SET
    title = v_title,
    unit_code = v_unit_code,
    unit_label = v_unit_label,
    rate_amount = p_rate,
    category = v_category,
    subcategory = v_subcategory,
    code = v_code,
    description = v_description,
    included_operations = v_included_operations,
    excluded_operations = v_excluded_operations,
    source_name = v_source_name,
    source_external_row_key = v_source_external_row_key,
    currency_code = v_currency_code,
    price_kind = v_price_kind,
    updated_by = p_user_id,
    version = v_existing_version + 1
  WHERE w.workspace_owner_id = p_workspace_owner_id
    AND w.id = p_id
    AND w.deleted_at IS NULL
  RETURNING w.* INTO v_work;

  SELECT coalesce(array_agg(wa.alias ORDER BY wa.weight DESC, wa.alias ASC), ARRAY[]::text[])
    INTO v_aliases
  FROM public.work_aliases wa
  WHERE wa.workspace_owner_id = p_workspace_owner_id
    AND wa.work_id = p_id
    AND wa.deleted_at IS NULL;

  SELECT coalesce(array_agg(wk.keyword ORDER BY wk.weight DESC, wk.keyword ASC), ARRAY[]::text[])
    INTO v_keywords
  FROM public.work_keywords wk
  WHERE wk.workspace_owner_id = p_workspace_owner_id
    AND wk.work_id = p_id
    AND wk.deleted_at IS NULL;

  IF p_enqueue_embedding THEN
    v_embedding_input_text := array_to_string(
      ARRAY[
        'Название: ' || v_work.title,
        'Категория: ' || v_work.category,
        CASE WHEN v_work.subcategory IS NOT NULL THEN 'Подкатегория: ' || v_work.subcategory END,
        'Единица: ' || coalesce(nullif(v_work.unit_label, ''), v_work.unit_code),
        'Тип цены: ' || v_work.price_kind::text,
        CASE WHEN v_work.description IS NOT NULL THEN 'Описание: ' || v_work.description END,
        CASE WHEN v_work.included_operations IS NOT NULL THEN 'Включено: ' || v_work.included_operations END,
        CASE WHEN v_work.excluded_operations IS NOT NULL THEN 'Исключено: ' || v_work.excluded_operations END,
        CASE WHEN cardinality(v_aliases) > 0 THEN 'Синонимы: ' || array_to_string(v_aliases, '; ') END,
        CASE WHEN cardinality(v_keywords) > 0 THEN 'Ключевые слова: ' || array_to_string(v_keywords, '; ') END
      ],
      E'\n'
    );

    v_content_hash := encode(
      extensions.digest(convert_to(trim(v_embedding_input_text), 'UTF8'), 'sha256'),
      'hex'
    );

    UPDATE public.directory_work_embeddings e
    SET status = 'stale'
    WHERE e.workspace_owner_id = p_workspace_owner_id
      AND e.work_id = p_id
      AND e.model_name = 'text-embedding-3-small'
      AND e.content_hash <> v_content_hash
      AND e.status IN ('pending', 'ready', 'failed');

    INSERT INTO public.directory_work_embeddings (
      workspace_owner_id,
      work_id,
      model_name,
      dimensions,
      content_hash,
      embedding_input_text,
      status,
      last_error
    )
    VALUES (
      p_workspace_owner_id,
      p_id,
      'text-embedding-3-small',
      1536,
      v_content_hash,
      v_embedding_input_text,
      'pending',
      NULL
    )
    ON CONFLICT (workspace_owner_id, work_id, model_name, content_hash)
    DO UPDATE SET
      embedding_input_text = excluded.embedding_input_text,
      status = 'pending',
      last_error = NULL,
      updated_at = now();
  END IF;

  RETURN QUERY
  SELECT
    v_work.id,
    v_work.title,
    v_work.unit_code,
    v_work.unit_label,
    v_work.rate_amount,
    v_work.currency_code,
    v_work.price_kind,
    v_work.category,
    v_work.subcategory,
    v_work.code,
    v_work.description,
    v_work.included_operations,
    v_work.excluded_operations,
    v_work.source_name,
    v_work.source_external_row_key,
    v_work.status,
    v_work.version,
    v_work.created_at,
    v_work.updated_at,
    v_aliases,
    v_keywords;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_directory_work_with_embedding(
  uuid,
  uuid,
  uuid,
  text,
  text,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  varchar,
  public.directory_work_price_kind,
  boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_directory_work_with_embedding(
  uuid,
  uuid,
  uuid,
  text,
  text,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  varchar,
  public.directory_work_price_kind,
  boolean
) TO service_role;
