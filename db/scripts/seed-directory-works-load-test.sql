-- Representative directory_works load-test seed for issue #90.
--
-- Usage (non-production only):
--   psql "$DATABASE_URL" \
--     -v workspace_owner_id='00000000-0000-0000-0000-000000000000' \
--     -v row_count='100000' \
--     -f db/scripts/seed-directory-works-load-test.sql
--
-- The workspace_owner_id must reference an existing public.profiles(id). The
-- script is idempotent for source_name='load-test-issue-90' because it writes a
-- deterministic source_external_row_key per generated row.

\set ON_ERROR_STOP on

BEGIN;

DELETE FROM public.directory_works
WHERE workspace_owner_id = :'workspace_owner_id'::uuid
  AND source_name = 'load-test-issue-90';

WITH settings AS (
  SELECT
    :'workspace_owner_id'::uuid AS workspace_owner_id,
    greatest(coalesce(nullif(:'row_count', '')::integer, 100000), 1) AS row_count,
    ARRAY['Отделка', 'Черновые работы', 'Инженерные системы', 'Кровля', 'Фасад', 'Благоустройство']::text[] AS categories,
    ARRAY['Подготовка', 'Монтаж', 'Демонтаж', 'Финишная отделка', 'Пусконаладка']::text[] AS subcategories,
    ARRAY['м2', 'м3', 'пог.м', 'шт', 'компл', 'т']::text[] AS units
), generated AS (
  SELECT
    settings.workspace_owner_id,
    n AS row_number,
    settings.categories[((n - 1) % array_length(settings.categories, 1)) + 1] AS category,
    settings.subcategories[((n - 1) % array_length(settings.subcategories, 1)) + 1] AS subcategory,
    settings.units[((n - 1) % array_length(settings.units, 1)) + 1] AS unit_label
  FROM settings
  CROSS JOIN generate_series(1, settings.row_count) AS n
), inserted AS (
  INSERT INTO public.directory_works (
    workspace_owner_id,
    title,
    unit_code,
    unit_label,
    rate_amount,
    category,
    subcategory,
    code,
    description,
    included_operations,
    excluded_operations,
    source_name,
    source_external_row_key,
    currency_code,
    price_kind,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  SELECT
    g.workspace_owner_id,
    format('%s — %s #%s', g.category, g.subcategory, lpad(g.row_number::text, 6, '0')),
    private.directory_work_normalize(g.unit_label),
    g.unit_label,
    (100 + (g.row_number % 9000))::numeric,
    g.category,
    g.subcategory,
    format('LT90-%s', lpad(g.row_number::text, 6, '0')),
    format('Load-test work row %s for read/search benchmarking', g.row_number),
    'Подготовка, выполнение работ, контроль качества',
    'Материалы и непредвиденные работы',
    'load-test-issue-90',
    format('issue-90-%s', lpad(g.row_number::text, 6, '0')),
    'RUB',
    CASE WHEN g.row_number % 5 = 0 THEN 'labor'::public.directory_work_price_kind ELSE 'base'::public.directory_work_price_kind END,
    'active'::public.directory_work_status,
    g.workspace_owner_id,
    g.workspace_owner_id,
    now() - ((g.row_number % 365) || ' days')::interval,
    now() - ((g.row_number % 30) || ' minutes')::interval
  FROM generated g
  RETURNING
    id,
    workspace_owner_id,
    code,
    title,
    replace(source_external_row_key, 'issue-90-', '')::integer AS rn
)
INSERT INTO public.work_aliases (workspace_owner_id, work_id, alias, normalized_alias, source, weight, created_by)
SELECT
  i.workspace_owner_id,
  i.id,
  format('Алиас %s', i.code),
  private.directory_work_normalize(format('Алиас %s', i.code)),
  'import'::public.directory_work_term_source,
  1,
  i.workspace_owner_id
FROM inserted i
WHERE i.rn % 10 = 0
ON CONFLICT (workspace_owner_id, work_id, normalized_alias) WHERE deleted_at IS NULL DO NOTHING;

WITH seeded AS (
  SELECT id, workspace_owner_id, code, row_number() OVER (ORDER BY source_external_row_key) AS rn
  FROM public.directory_works
  WHERE workspace_owner_id = :'workspace_owner_id'::uuid
    AND source_name = 'load-test-issue-90'
    AND deleted_at IS NULL
)
INSERT INTO public.work_keywords (workspace_owner_id, work_id, keyword, normalized_keyword, source, weight, created_by)
SELECT
  s.workspace_owner_id,
  s.id,
  CASE WHEN s.rn % 2 = 0 THEN 'штукатурка' ELSE 'монтаж' END,
  private.directory_work_normalize(CASE WHEN s.rn % 2 = 0 THEN 'штукатурка' ELSE 'монтаж' END),
  'import'::public.directory_work_term_source,
  1,
  s.workspace_owner_id
FROM seeded s
WHERE s.rn % 8 = 0
ON CONFLICT (workspace_owner_id, work_id, normalized_keyword) WHERE deleted_at IS NULL DO NOTHING;

ANALYZE public.directory_works;
ANALYZE public.work_aliases;
ANALYZE public.work_keywords;

COMMIT;
