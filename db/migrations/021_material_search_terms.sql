alter table public.directory_materials
  add column if not exists aliases text[] not null default '{}'::text[],
  add column if not exists keywords text[] not null default '{}'::text[];

create index if not exists idx_directory_materials_workspace_aliases
  on public.directory_materials using gin (aliases);

create index if not exists idx_directory_materials_workspace_keywords
  on public.directory_materials using gin (keywords);

create or replace function private.set_directory_material_search_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.normalized_name = private.directory_material_normalize(new.name);
  new.search_text = trim(concat_ws(' ',
    new.name,
    new.code,
    new.unit_code,
    new.unit_label,
    new.category,
    new.subcategory,
    new.supplier_name,
    array_to_string(coalesce(new.aliases, '{}'::text[]), ' '),
    array_to_string(coalesce(new.keywords, '{}'::text[]), ' '),
    new.description,
    new.source_name,
    new.source_external_row_key
  ));
  new.dedupe_fingerprint = private.directory_material_build_fingerprint(
    new.normalized_name,
    new.unit_code,
    new.category,
    new.subcategory,
    new.code,
    new.supplier_name,
    new.source_name,
    new.source_external_row_key
  );
  new.search_fts =
    setweight(to_tsvector('simple', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.code, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.subcategory, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.supplier_name, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.aliases, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.keywords, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.unit_code, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(new.unit_label, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(new.source_name, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(new.source_external_row_key, '')), 'D');
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_directory_materials_search_fields on public.directory_materials;
create trigger trg_directory_materials_search_fields
  before insert or update of
    name,
    unit_code,
    unit_label,
    category,
    subcategory,
    code,
    supplier_name,
    aliases,
    keywords,
    description,
    source_name,
    source_external_row_key
  on public.directory_materials
  for each row
  execute function private.set_directory_material_search_fields();

drop function if exists public.search_directory_materials_ai(uuid, text, vector(1536), text, text, text, integer, numeric);

create function public.search_directory_materials_ai(
  p_workspace_owner_id uuid,
  p_query text,
  p_query_embedding vector(1536),
  p_category text default null,
  p_subcategory text default null,
  p_unit text default null,
  p_limit integer default 20,
  p_threshold numeric default 0.72
)
returns table (
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
  status directory_material_status,
  version integer,
  created_at timestamptz,
  updated_at timestamptz,
  semantic_score numeric,
  text_score numeric,
  hybrid_score numeric,
  match_reason text
)
language sql
stable
as $$
  with normalized as (
    select
      lower(btrim(coalesce(p_query, ''))) as q,
      greatest(1, least(coalesce(p_limit, 20), 50)) as result_limit,
      least(greatest(coalesce(p_threshold, 0.72), 0), 1) as threshold
  ),
  ranked as (
    select
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
      greatest(0, 1 - (e.embedding <=> p_query_embedding))::numeric as semantic_score,
      case
        when lower(coalesce(m.code, '')) = normalized.q then 1.00
        when lower(coalesce(m.source_external_row_key, '')) = normalized.q then 0.98
        when m.normalized_name = normalized.q then 0.95
        when m.normalized_name like normalized.q || '%' then 0.82
        when lower(coalesce(m.supplier_name, '')) like '%' || normalized.q || '%' then 0.58
        when exists (
          select 1 from unnest(coalesce(m.aliases, '{}'::text[])) as alias_value
          where lower(alias_value) = normalized.q or lower(alias_value) like normalized.q || '%'
        ) then 0.76
        when exists (
          select 1 from unnest(coalesce(m.keywords, '{}'::text[])) as keyword_value
          where lower(keyword_value) = normalized.q or lower(keyword_value) like normalized.q || '%'
        ) then 0.70
        when lower(coalesce(m.category, '')) like '%' || normalized.q || '%' then 0.50
        when lower(coalesce(m.subcategory, '')) like '%' || normalized.q || '%' then 0.48
        when m.search_text ilike '%' || normalized.q || '%' then 0.45
        else 0
      end::numeric as text_score
    from public.directory_materials m
    join public.directory_material_embeddings e
      on e.workspace_owner_id = m.workspace_owner_id
     and e.material_id = m.id
     and e.model_name = 'text-embedding-3-small'
     and e.dimensions = 1536
     and e.status = 'ready'
     and e.embedding is not null
    cross join normalized
    where m.workspace_owner_id = p_workspace_owner_id
      and m.status = 'active'
      and m.deleted_at is null
      and (p_category is null or m.category = p_category)
      and (p_subcategory is null or m.subcategory = p_subcategory)
      and (p_unit is null or m.unit_code = lower(btrim(p_unit)) or m.unit_label = p_unit)
  ),
  hybrid as (
    select
      ranked.*,
      ((ranked.semantic_score * 0.68) + (ranked.text_score * 0.32))::numeric as hybrid_score
    from ranked
  )
  select
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
    coalesce(hybrid.aliases, '{}'::text[]) as aliases,
    coalesce(hybrid.keywords, '{}'::text[]) as keywords,
    hybrid.source_name,
    hybrid.source_external_row_key,
    hybrid.status,
    hybrid.version,
    hybrid.created_at,
    hybrid.updated_at,
    hybrid.semantic_score,
    hybrid.text_score,
    hybrid.hybrid_score,
    case
      when hybrid.text_score >= 0.95 then 'Точное совпадение'
      when hybrid.text_score >= 0.80 then 'Совпадение по названию'
      when hybrid.text_score >= 0.70 then 'Совпадение по синонимам или ключевым словам'
      when hybrid.semantic_score >= 0.86 then 'Близкий по смыслу материал'
      when hybrid.text_score > 0 then 'Текстовое совпадение'
      else 'Семантическое совпадение'
    end as match_reason
  from hybrid
  cross join normalized
  where hybrid.semantic_score >= normalized.threshold or hybrid.text_score > 0
  order by
    case when hybrid.text_score >= 0.95 then 0 else 1 end,
    hybrid.hybrid_score desc,
    hybrid.text_score desc,
    hybrid.updated_at desc,
    hybrid.id asc
  limit (select result_limit from normalized);
$$;

revoke all on function public.search_directory_materials_ai(uuid, text, vector(1536), text, text, text, integer, numeric) from public;
grant execute on function public.search_directory_materials_ai(uuid, text, vector(1536), text, text, text, integer, numeric) to service_role;
