# Directory works performance hardening

> Status: implementation notes for issue #71, part of epic #64.
> Scope: cache, indexing, query diagnostics, import/export reliability, AI search invalidation and observability for `/directories/works`.

Issue #71 is the hardening pass after the DB foundation, read API, CRUD UI, import/export and AI/hybrid search phases. It does not change the business model of the works catalog. It tightens the existing implementation around real query patterns and gives maintainers DB and application-level signals for slow paths.

---

## Query patterns covered

The hardening migration and service changes cover these production paths:

```txt
list by workspace
regular search by q
filter by category/subcategory/unit
exact lookup by code/source key
manual create/update/archive duplicate checks
import duplicate detection and apply
import job polling
export with workspace filters
embedding queue polling
AI vector/hybrid search
```

The foundation indexes from migrations `010` and `012` remain valid. Migration `013_directory_works_performance_hardening.sql` adds narrower partial/composite indexes for the hot paths instead of replacing the broad indexes blindly.

---

## DB hardening

### Active catalog indexes

The new active-row indexes target the default UI state:

```txt
workspace_owner_id + updated_at DESC + id
workspace_owner_id + normalized_title ASC + id
workspace_owner_id + category + subcategory + unit_code + updated_at DESC
workspace_owner_id + unit_code + updated_at DESC
workspace_owner_id + dedupe_fingerprint + updated_at DESC
```

All of these are partial on:

```txt
status = 'active' AND deleted_at IS NULL
```

This keeps the common list/search/export path smaller than scanning all archived/deleted rows.

### Alias and keyword lookups

Alias and keyword exact/prefix matching keeps the parent `work_id` in the index:

```txt
work_aliases: workspace_owner_id + normalized_alias + work_id
work_keywords: workspace_owner_id + normalized_keyword + work_id
```

The trigram GIN indexes from the foundation migration remain the fuzzy-search path.

### Import indexes

Import job and row indexes support polling and chunked apply:

```txt
import_jobs: workspace_owner_id + updated_at DESC + id for open statuses
import_rows: workspace_owner_id + job_id + action + status + row_number
import_rows: workspace_owner_id + applied_work_id where applied_work_id is not null
import_rows: workspace_owner_id + duplicate_work_id where duplicate_work_id is not null
```

The import detail endpoint intentionally remains cache-bypassed because it is used by preview/progress polling and should not serve stale job state.

### Embedding indexes

The HNSW vector index stays in migration `012`. The hardening migration adds queue and ready-row maintenance indexes:

```txt
workspace_owner_id + model_name + dimensions + status + updated_at ASC for pending/stale/failed rows
workspace_owner_id + work_id + model_name + dimensions + generated_at DESC for ready rows
```

This supports bounded queue processing and work-scoped invalidation after create/update/import.

---

## DB diagnostics

Migration `013` adds service-role-only diagnostics:

```txt
public.explain_directory_works_search_plan(...)
public.explain_directory_work_categories_plan(...)
public.get_directory_works_performance_snapshot(workspace_owner_id)
```

These functions are not exposed to authenticated browser clients. They are intended for preview/staging verification before further tuning. They let maintainers inspect JSON `EXPLAIN` plans for the canonical read/search/category RPCs and get a compact count snapshot for active/archive/deleted works, unresolved imports and embedding queue state.

Suggested validation after applying migration `013`:

```sql
select public.explain_directory_works_search_plan('<workspace-owner-id>'::uuid, 'штукатурка');
select public.explain_directory_work_categories_plan('<workspace-owner-id>'::uuid);
select * from public.get_directory_works_performance_snapshot('<workspace-owner-id>'::uuid);
```

Use real workspace ids from a non-production or preview dataset first.

---

## Server cache strategy

Read paths now use short-lived `unstable_cache` with workspace-scoped tags:

```txt
list/search:     30s, tag directory-works:<workspaceOwnerId>
detail:          120s, tags directory-work:<workspaceOwnerId>:<workId>, directory-works:<workspaceOwnerId>
categories:      300s, tags directory-works-categories:<workspaceOwnerId>, directory-works:<workspaceOwnerId>
AI search:        30s, tags directory-works-ai:<workspaceOwnerId>:<queryHash>, directory-works-ai:<workspaceOwnerId>:index, directory-works:<workspaceOwnerId>
```

Dynamic mutation/polling paths remain uncached:

```txt
create/update/archive
import job create/detail/apply
export
embedding queue processing
```

This keeps high-read flows fast while avoiding stale state for imports and exports.

---

## Invalidation matrix

Manual mutations:

```txt
create/update/archive
→ revalidate directory-works:<workspaceOwnerId>
→ revalidate directory-works-categories:<workspaceOwnerId>
→ revalidate directory-works-ai:<workspaceOwnerId>:index
→ revalidate directory-work:<workspaceOwnerId>:<workId>
```

Import apply:

```txt
apply import job
→ revalidate directory-works:<workspaceOwnerId>
→ revalidate directory-works-categories:<workspaceOwnerId>
→ revalidate directory-works-ai:<workspaceOwnerId>:index
→ revalidate directory-works-import:<workspaceOwnerId>:<jobId>
```

Embedding processing:

```txt
processed > 0 or failed > 0
→ revalidate directory-works-ai:<workspaceOwnerId>:index
```

This keeps AI results from staying stale after new vectors are generated while avoiding global application refetches.

---

## Client cache strategy

`useDirectoryWorks` keeps list results warm briefly:

```txt
staleTime: 30s
gcTime:    5m
refetchOnWindowFocus: true
placeholderData: previousData
```

Mutations invalidate only the works/categorical/detail/AI keys owned by the works feature. Import apply invalidates the whole AI search key prefix because bulk import can materially change many semantic results.

---

## Observability

`features/directory-works/server/directory-works.observability.ts` provides a lightweight timing wrapper around service operations. It records structured console payloads for:

```txt
list/detail/categories
create/update/archive
import create/detail/apply
export
AI search
embedding processing
```

Slow operations at or above 500ms emit:

```txt
[directory-works:slow-path]
```

The emitted payload includes `slowThresholdMs` so logs can be interpreted without checking source code.

Development non-slow operations emit:

```txt
[directory-works:metric]
```

The helper intentionally avoids adding a vendor-specific metrics dependency. It can later be wired to Vercel logs, OpenTelemetry or a product analytics backend without changing service call sites.

---

## Export/import reliability

Exports already page through the read RPC in chunks and cap the output at `MAX_EXPORT_ROWS`. The hardening pass keeps export cache-bypassed and adds timing metrics so large exports are visible as slow paths.

Imports already apply rows in chunks. The hardening pass improves DB indexes around job polling, action/status row selection and applied-work lookups, and keeps import detail uncached for progress freshness.

---

## Future tuning rules

Do not remove the broad foundation indexes until real `EXPLAIN` plans show they are unused or harmful. The first post-merge tuning workflow should be:

```txt
1. Apply migration 013 to preview/staging.
2. Seed or import representative works data.
3. Run search/category diagnostics for common filters and queries.
4. Check Supabase/Postgres slow query logs.
5. Only then add/drop indexes in a new migration.
```

For production-scale datasets, consider adding dedicated cursor pagination based on `(updated_at, id)` and `(normalized_title, id)` instead of offset pagination. That is intentionally out of scope for #71 because the public API currently exposes numeric cursor offsets.
