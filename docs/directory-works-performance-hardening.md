# Directory works performance hardening

> Status: implementation notes for issue #71, part of epic #64.
> Scope: cache, indexing, query diagnostics, import/export reliability, AI search invalidation, RPC-backed mutation hot paths and observability for `/directories/works`.

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

## RPC-backed mutation hot paths

After Vercel Functions were moved to `fra1` and Supabase remained in `eu-west-1`, the remaining update latency was caused mainly by sequential backend-to-Supabase round trips, not by PostgreSQL execution time.

The original update path performed multiple Supabase/PostgREST calls:

```txt
auth/workspace/role checks
→ read current work
→ uniqueness checks
→ update directory_works
→ read updated work
→ update stale embedding rows
→ upsert pending embedding row
→ cache invalidation
```

Migration `015_directory_work_update_rpc.sql` introduces `public.update_directory_work_with_embedding(...)`. The HTTP contract remains unchanged:

```txt
PATCH /api/directory-works/:id
```

The optimized server flow is:

```txt
PATCH route
→ Zod validation
→ require authenticated user
→ require current workspace
→ require write role: owner/admin/manager
→ repository calls public.update_directory_work_with_embedding(...)
→ revalidate directory works cache tags
```

The RPC owns only database-local mutation work:

```txt
check row exists in workspace
check code uniqueness
check source_name + source_external_row_key uniqueness
normalize title/unit/category fields
update directory_works
return the updated UI projection
mark old embedding rows stale
upsert the new pending embedding row
```

Security requirements for mutation RPCs:

```txt
SECURITY DEFINER
SET search_path = ''
REVOKE EXECUTE FROM PUBLIC, anon, authenticated
GRANT EXECUTE TO service_role
```

The browser must continue calling the Next.js route only. Mutation RPCs are service-role-only and may be called only after application-level authorization.

For future interactive mutation hot paths, prefer a single service-role-only RPC when all of these are true:

```txt
1. The mutation needs multiple related DB reads/writes.
2. The reads/writes must happen sequentially for correctness.
3. The operation is called from interactive UI, such as save/edit/archive.
4. The operation can return a stable projection to the API layer.
5. Authorization can be checked before the RPC call.
```

Avoid implementing hot mutations as many sequential Supabase/PostgREST calls from server code when those calls only coordinate database-local work.

Good candidates:

```txt
update canonical directory row + uniqueness checks + search fields + queue markers
archive row + version bump + dependent queue/cache marker
bulk apply import rows in chunks
status transitions with summary counters
```

Poor candidates:

```txt
single simple read
pure UI projection mapping
third-party API calls
logic that requires user/session objects inside SQL
operations where browser clients need direct access
```

CRUD routes must not synchronously call the embedding provider. They should only enqueue or mark embedding work. Provider calls remain in the bounded embedding processor route:

```txt
POST /api/directory-works/embeddings/process
```

For update, `update_directory_work_with_embedding(...)` creates or updates the pending embedding queue row directly, so the service layer must not enqueue the same work a second time after the RPC returns.

Database-specific mutation errors should be mapped in the repository/service layer into stable API errors. Current mappings:

```txt
DIRECTORY_WORK_CODE_DUPLICATE   → 400 Работа с таким кодом уже существует
DIRECTORY_WORK_SOURCE_DUPLICATE → 400 Работа с таким внешним идентификатором уже существует
empty/invalid input             → validation should normally be caught by Zod before RPC
```

The API response contract should stay stable even if the database implementation changes.

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

## 100k-row read/search hardening

Issue #90 extends the original hardening with a repeatable non-production load-test seed and an optimized `search_directory_works(...)` implementation for large catalogs. Use `db/scripts/seed-directory-works-load-test.sql` only against staging/preview workspaces:

```bash
psql "$DATABASE_URL" \
  -v workspace_owner_id='<workspace-owner-id>' \
  -v row_count='100000' \
  -f db/scripts/seed-directory-works-load-test.sql
```

The final strategy keeps the public API shape stable while changing the internal read plan:

- empty browse/list requests are an indexed list path, not a relevance search; they skip `count(*) OVER()` and do not aggregate aliases/keywords for the intermediate workspace set;
- exact code/source-key queries are checked first through lower-case expression indexes and return the targeted hit set without fuzzy/trigram ranking;
- general fuzzy search is candidate-capped before final ranking: work title/FTS/trigram candidates are capped separately from alias and keyword candidates, and alias/keyword arrays are aggregated only after the candidate set is bounded;
- category/subcategory/unit filters use normalized expression indexes on active rows;
- interactive numeric cursors are accepted for compatibility but capped at 5,000 rows so deep pagination cannot force unbounded `OFFSET` work;
- export remains synchronous but bounded to 10,000 rows and reads the list endpoint in 100-row chunks. Larger exports should move to a staged/background flow before raising that cap.

Benchmark checklist for PRs that touch this path:

```txt
GET /api/directory-works?sort=updated_desc
GET /api/directory-works?sort=title_asc
GET /api/directory-works?q=<exact code>
GET /api/directory-works?q=<title prefix>
GET /api/directory-works?q=<fuzzy text>
GET /api/directory-works?category=<category>
GET /api/directory-works/categories
GET /api/directory-works/export?format=csv
```

Record p50/p95 response time, Vercel runtime/region, row counts, candidate sizes and whether EXPLAIN uses the intended indexes. In this local implementation pass, live Supabase/Vercel timings were not available; run the checklist against staging after applying migration 016 and the load-test seed.

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
1. Apply migrations to preview/staging.
2. Seed or import representative works data.
3. Run search/category diagnostics for common filters and queries.
4. Check Supabase/Postgres slow query logs.
5. Check `[directory-works:slow-path]` in Vercel logs.
6. Only then add/drop indexes or introduce new mutation RPCs in a new migration.
```

For production-scale datasets, consider adding dedicated cursor pagination based on `(updated_at, id)` and `(normalized_title, id)` instead of offset pagination. That is intentionally out of scope for #71 because the public API currently exposes numeric cursor offsets.
