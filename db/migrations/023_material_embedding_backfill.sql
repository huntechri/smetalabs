-- ============================================================================
-- Migration: 023_material_embedding_backfill
-- Description: Create pending material embedding rows in small background batches.
-- Date: 2026-05-16
-- ============================================================================

create or replace function public.enqueue_missing_directory_material_embeddings(
  p_limit integer default 10
)
returns integer
language sql
security definer
set search_path = ''
as $$
  with candidates as (
    select
      m.id as material_id,
      m.workspace_owner_id,
      trim(concat_ws(E'\n',
        'Материал: ' || m.name,
        case when m.code is not null and btrim(m.code) <> '' then 'Код: ' || m.code end,
        'Категория: ' || m.category,
        case when m.subcategory is not null and btrim(m.subcategory) <> '' then 'Подкатегория: ' || m.subcategory end,
        'Единица: ' || coalesce(nullif(m.unit_label, ''), m.unit_code),
        'Цена: ' || m.price_amount::text || ' ' || m.currency_code,
        case when m.supplier_name is not null and btrim(m.supplier_name) <> '' then 'Поставщик: ' || m.supplier_name end,
        case when array_length(m.aliases, 1) > 0 then 'Синонимы: ' || array_to_string(m.aliases, '; ') end,
        case when array_length(m.keywords, 1) > 0 then 'Ключевые слова: ' || array_to_string(m.keywords, '; ') end,
        case when m.description is not null and btrim(m.description) <> '' then 'Описание: ' || m.description end
      )) as input_text
    from public.directory_materials m
    where m.status = 'active'
      and m.deleted_at is null
      and not exists (
        select 1
        from public.directory_material_embeddings e
        where e.workspace_owner_id = m.workspace_owner_id
          and e.material_id = m.id
          and e.model_name = 'text-embedding-3-small'
          and e.dimensions = 1536
          and e.status in ('pending', 'ready', 'failed')
      )
    order by m.updated_at asc, m.id asc
    limit greatest(1, least(coalesce(p_limit, 10), 20))
  ),
  inserted as (
    insert into public.directory_material_embeddings (
      workspace_owner_id,
      material_id,
      model_name,
      dimensions,
      content_hash,
      embedding_input_text,
      status,
      last_error
    )
    select
      c.workspace_owner_id,
      c.material_id,
      'text-embedding-3-small',
      1536,
      md5('text-embedding-3-small:1536:' || c.input_text),
      c.input_text,
      'pending'::public.directory_material_embedding_status,
      null
    from candidates c
    on conflict (workspace_owner_id, material_id, model_name, content_hash) do update
      set status = 'pending',
          last_error = null,
          updated_at = now()
    returning 1
  )
  select count(*)::integer from inserted;
$$;

revoke execute on function public.enqueue_missing_directory_material_embeddings(integer) from public, anon, authenticated;
grant execute on function public.enqueue_missing_directory_material_embeddings(integer) to service_role;