# Directory works architecture

> Last updated: 2026-05-14
>
> Status: implemented production backend contract for epic #64, phases #65-#71.
>
> Scope: DB schema, search, CRUD, import/export, embeddings, cache/indexing and observability architecture for `/directories/works`.

This document is the canonical contract for the works catalog. It started as the #65 backend contract and now reflects the implemented state after the DB foundation, read/search API, UI backend integration, staged import/export, AI/hybrid search and performance hardening phases.

The current UI may expose a compact projection (`Код / Название / Ед. изм. / Расценка / Категория`), while the backend preserves structured data for tenant isolation, import staging, deduplication, full-text/fuzzy search, semantic search and targeted cache invalidation.

For mutation hot paths, also follow `docs/directory-works-rpc-mutation-pattern.md`. Interactive mutations that coordinate several database-local reads/writes should prefer service-role-only RPCs after application-level authorization instead of multiple sequential Supabase/PostgREST calls.

---

## 1. Phase status

Epic #64 directory works phases are represented as follows:

```txt
#65 contract/documentation                → docs/directory-works-architecture.md
#66 DB foundation                         → db/schema/directory-works.ts + migration 010
#67 read API and regular search           → migration 011 + app/api/directory-works read/search routes
#68 UI backend integration/manual CRUD    → feature hooks/dialogs + POST/PATCH/DELETE routes
#69 import/export staging flow            → import job routes, CSV staging preview/apply, CSV/XLSX export
#70 embeddings and AI/hybrid search       → migration 012 + ai-search and embeddings process routes
#71 cache/indexing/performance hardening  → migration 013 + observability/cache/indexing helpers
```

The old contract-phase non-goals no longer apply globally. They only describe what was intentionally excluded from the original documentation-only #65 slice.

---

## 2. Ownership and tenant boundary

The tenant boundary for the subsystem is `workspace_owner_id`.

```txt
workspace_owner_id = workspace_members.owner_id
```

Rules:

- every canonical, supporting, import and embedding table stores `workspace_owner_id` as a required column;
- API routes, server actions and repositories resolve the current workspace server-side through the authenticated user and the workspace helper layer;
- clients must never provide `workspace_owner_id` as an authority source;
- RLS policies and private DB helpers filter by `workspace_owner_id` and authenticated membership;
- service-role access is allowed only server-side after an explicit permission check;
- archived/deleted works are excluded from normal list/search responses unless a route explicitly opts into them and the user has sufficient permission.

The current workspace model is still owner-bound rather than a separate `workspaces` table. Do not introduce a parallel workspace identity only for this subsystem.

---

## 3. Runtime ownership map

```txt
/directories/works
  → app/(main)/directories/works/page.tsx
  → features/directory-works/components/directory-works-view.tsx
  → features/directory-works/hooks/**
  → features/directory-works/api/**
  → app/api/directory-works/**
  → features/directory-works/server/**
  → db/schema/directory-works.ts
  → db/migrations/010_directory_works_foundation.sql
  → db/migrations/011_directory_works_read_api.sql
  → db/migrations/012_directory_works_ai_search.sql
  → db/migrations/013_directory_works_performance_hardening.sql
  → db/migrations/014_private_service_role_grants.sql
  → db/migrations/015_directory_work_update_rpc.sql
```

Feature responsibilities:

- `features/directory-works/api/**` owns client fetchers, mappers, errors, cache tags and query keys.
- `features/directory-works/hooks/**` owns TanStack Query reads/mutations and invalidation behavior.
- `features/directory-works/server/**` owns repository/service/search/import/export/embedding/observability logic.
- `app/api/directory-works/**` owns HTTP boundaries and delegates domain logic into `features/directory-works/server/**`.
- `db/schema/directory-works.ts` and migrations 010-015 own the database contract.

Do not move SQL, permission checks, import apply logic or embedding generation into UI components.

---

## 4. Canonical table: `directory_works`

`directory_works` stores the canonical workspace-scoped works used by estimates, templates, imports and search.

```txt
TABLE public.directory_works
──────────────────────────────────────────────────────────────────────────────
Column                    Type                    Required  Notes
──────────────────────────────────────────────────────────────────────────────
id                        uuid                    yes       Primary key.
workspace_owner_id        uuid                    yes       Tenant boundary; equals workspace_members.owner_id.
title                     text                    yes       Human-readable work title.
normalized_title          text                    yes       Backend-normalized title for exact/prefix/fuzzy matching.
unit_code                 text                    yes       Canonical unit code, for example m2, m3, pcs, set.
unit_label                text                    yes       Display label, for example м², м³, шт, компл.
rate_amount               numeric(12,2)           yes       Non-negative base rate.
currency_code             char(3)                 yes       ISO-4217 code; default RUB unless product config changes.
price_kind                text                    yes       base | labor | turnkey | estimate | custom.
category                  text                    yes       Required for UI grouping and import quality.
subcategory               text                    no        Optional nested grouping.
code                      text                    no        Workspace-scoped catalog code.
description               text                    no        Searchable long description.
included_operations       text                    no        Searchable included scope.
excluded_operations       text                    no        Searchable excluded scope.
source_name               text                    no        External catalog/source name for import.
source_external_row_key   text                    no        Source row id/code for repeat import matching.
dedupe_fingerprint        text                    yes       Stable normalized fingerprint for duplicate detection.
search_text               text                    yes       Denormalized search document.
search_fts                tsvector                yes       Full-text vector generated from search_text and weighted fields.
status                    text                    yes       active | archived.
version                   integer                 yes       Optimistic/concurrency version, starts at 1.
created_by                uuid                    yes       Auth user who created the row.
updated_by                uuid                    no        Last auth user who changed the row.
created_at                timestamptz             yes       Default now().
updated_at                timestamptz             yes       Default now(), maintained on write.
archived_at               timestamptz             no        Archive timestamp.
deleted_at                timestamptz             no        Soft-delete timestamp.
──────────────────────────────────────────────────────────────────────────────
```

Required UI projection:

```txt
code        <- directory_works.code
title       <- directory_works.title
unit        <- directory_works.unit_label or unit_code
rate        <- directory_works.rate_amount + currency_code
category    <- directory_works.category
```

Canonical write rules:

- `title` is trimmed and non-empty;
- `normalized_title` is generated by backend/DB normalization, not accepted directly from UI;
- `rate_amount >= 0`;
- `category` is required for production data;
- `unit_code` is normalized from controlled values or approved free-text mapping;
- `dedupe_fingerprint` is recalculated on create/update/import apply;
- `search_text` and `search_fts` are recalculated on create/update/import apply;
- canonical rows are not created from empty UI draft rows;
- physical deletion is not the default because works can be referenced by estimates/templates;
- manual delete/archive paths soft-archive through `status = archived`, `archived_at`, and version increment.

Supported `price_kind` values:

```txt
base
labor
turnkey
estimate
custom
```

Supported canonical `status` values:

```txt
active
archived
```

`draft` is intentionally excluded from canonical rows until a separate draft persistence strategy is accepted. UI drafts should remain client-local or form-local.

---

## 5. Supporting tables

### 5.1 `work_aliases`

Alternative names and synonyms for a canonical work.

```txt
TABLE public.work_aliases
──────────────────────────────────────────────────────────────
Column              Type           Required  Notes
──────────────────────────────────────────────────────────────
id                  uuid           yes       Primary key.
workspace_owner_id  uuid           yes       Tenant boundary.
work_id             uuid           yes       FK -> directory_works.id.
alias               text           yes       Human-readable alias.
normalized_alias    text           yes       Backend-normalized alias.
source              text           no        manual | import | ai_suggestion | external.
weight              integer        yes       Ranking boost, default 1.
created_by          uuid           no        Auth user or null for system/import.
created_at          timestamptz    yes       Default now().
updated_at          timestamptz    yes       Default now().
deleted_at          timestamptz    no        Soft-delete.
──────────────────────────────────────────────────────────────
```

Rules:

- alias rows inherit tenant scope from `workspace_owner_id` and must match the parent work's owner id;
- aliases participate in exact/prefix/fuzzy search and semantic embedding input;
- duplicate aliases are unique per `workspace_owner_id + work_id + normalized_alias` where `deleted_at is null`.

### 5.2 `work_keywords`

Search keywords and tags used for exact/fuzzy ranking and embedding input.

```txt
TABLE public.work_keywords
──────────────────────────────────────────────────────────────
Column              Type           Required  Notes
──────────────────────────────────────────────────────────────
id                  uuid           yes       Primary key.
workspace_owner_id  uuid           yes       Tenant boundary.
work_id             uuid           yes       FK -> directory_works.id.
keyword             text           yes       Keyword/tag.
normalized_keyword  text           yes       Backend-normalized keyword.
source              text           no        manual | import | ai_suggestion | external.
weight              integer        yes       Ranking boost, default 1.
created_by          uuid           no        Auth user or null for system/import.
created_at          timestamptz    yes       Default now().
updated_at          timestamptz    yes       Default now().
deleted_at          timestamptz    no        Soft-delete.
──────────────────────────────────────────────────────────────
```

Rules:

- keywords are not a substitute for categories;
- duplicate keywords are unique per `workspace_owner_id + work_id + normalized_keyword` where `deleted_at is null`;
- keywords rank lower than exact code/title matches but higher than generic description matches.

---

## 6. Read/search API

The regular read/search API exposes these routes:

```txt
GET /api/directory-works
GET /api/directory-works/:id
GET /api/directory-works/search
GET /api/directory-works/categories
```

Supported query parameters:

```txt
q
category
subcategory
unit
status
limit
cursor
sort
```

Default filters:

```txt
workspace_owner_id = current workspace owner id
status = active
deleted_at is null
```

The API returns UI fields plus minimal metadata needed for editing:

```txt
id
title
unit_code
unit_label
rate_amount
currency_code
price_kind
category
subcategory
code
status
version
updated_at
```

Regular ranking order:

```txt
1. exact code or source_external_row_key match
2. exact normalized_title match
3. normalized_title prefix match
4. alias exact/prefix match
5. keyword exact/prefix match
6. weighted full-text rank over search_fts
7. trigram similarity over normalized_title/search_text/aliases/keywords
8. category/subcategory boost
9. recency/version tie-breakers only after relevance
```

Exact code/title matches must stay above weak semantic matches in the final hybrid experience.

---

## 7. Manual CRUD

Manual UI writes are routed through API handlers and feature server modules:

```txt
POST   /api/directory-works
PATCH  /api/directory-works/:id
DELETE /api/directory-works/:id
```

Rules:

- writes require authenticated workspace access and write permission for the current workspace;
- input is validated with Zod schemas;
- writes never trust client-provided `workspace_owner_id`;
- create/update recalculates normalized/search/dedupe fields;
- edit preserves extended fields that are not exposed in the first compact manual form;
- delete/archive is implemented as soft archive;
- create/update/import apply enqueue or mark embedding work for asynchronous processing;
- list/detail/categories and relevant AI-search cache keys are invalidated after material changes;
- server-side service-role repositories may write only after application-level authorization checks and must retain access to private trigger/helper functions through explicit database grants;
- interactive mutation hot paths that coordinate several database-local reads/writes should use a service-role-only RPC after API authorization; see `update_directory_work_with_embedding(...)` and `docs/directory-works-rpc-mutation-pattern.md`.

Current update path:

```txt
PATCH /api/directory-works/:id
→ validate body
→ require workspace write context
→ public.update_directory_work_with_embedding(...)
→ revalidate list/detail/categories/AI-index cache tags
```

The update RPC performs row existence check, uniqueness checks, normalization, `directory_works` update, updated projection return and embedding queue upsert in one database-local operation. The service layer must not enqueue the same embedding work again after this RPC returns.

---

## 8. Import/export staging flow

Import never writes raw uploaded data directly into `directory_works`. The flow is staged:

```txt
upload/select file
→ create import job
→ parse rows into staging rows
→ normalize
→ validate
→ detect duplicates/conflicts
→ preview
→ user confirms actions
→ chunked apply into directory_works
→ enqueue embedding refresh asynchronously
→ targeted cache invalidation
```

Current import/export routes:

```txt
POST /api/directory-works/import-jobs
GET  /api/directory-works/import-jobs/:id
POST /api/directory-works/import-jobs/:id/apply
GET  /api/directory-works/export
```

Current behavior:

- CSV import is supported through local parsing and server-side staging validation.
- Import preview persists job rows in `directory_work_import_jobs` and `directory_work_import_rows`.
- Apply processes valid/warning rows in chunks and supports `create`/`skip` style decisions.
- Imported aliases and keywords are inserted into `work_aliases` and `work_keywords`.
- XLSX export is supported using a minimal OpenXML ZIP writer without a new dependency.
- CSV export is supported for the current filtered works catalog.
- Export remains uncached and bounded by the export row cap.
- Import job detail remains uncached because progress freshness is more important than reuse.

### 8.1 `directory_work_import_jobs`

```txt
TABLE public.directory_work_import_jobs
────────────────────────────────────────────────────────────────
Column                Type           Required  Notes
────────────────────────────────────────────────────────────────
id                    uuid           yes       Primary key.
workspace_owner_id    uuid           yes       Tenant boundary.
created_by            uuid           yes       Auth user.
status                text           yes       See statuses below.
source_name           text           no        User/source label.
file_name             text           no        Original file name.
file_mime_type        text           no        CSV/XLSX/etc.
file_size_bytes       bigint         no        Upload size.
storage_bucket        text           no        Private bucket if file is stored.
storage_path          text           no        Workspace-scoped private object path.
total_rows            integer       yes       Default 0.
parsed_rows           integer       yes       Default 0.
valid_rows            integer       yes       Default 0.
warning_rows          integer       yes       Default 0.
error_rows            integer       yes       Default 0.
duplicate_rows        integer       yes       Default 0.
conflict_rows         integer       yes       Default 0.
applied_rows          integer       yes       Default 0.
skipped_rows          integer       yes       Default 0.
options               jsonb         yes       Parser/apply options.
summary               jsonb         yes       Preview/apply summary.
last_error            text          no        Last processing error.
started_at            timestamptz   no        Processing start.
completed_at          timestamptz   no        Processing completion.
created_at            timestamptz   yes       Default now().
updated_at            timestamptz   yes       Default now().
────────────────────────────────────────────────────────────────
```

Job statuses:

```txt
draft
uploaded
parsing
parsed
validating
validated
ready_for_review
applying
completed
failed
cancelled
```

### 8.2 `directory_work_import_rows`

```txt
TABLE public.directory_work_import_rows
────────────────────────────────────────────────────────────────────
Column                    Type           Required  Notes
────────────────────────────────────────────────────────────────────
id                        uuid           yes       Primary key.
workspace_owner_id        uuid           yes       Tenant boundary.
job_id                    uuid           yes       FK -> directory_work_import_jobs.id.
row_number                integer        yes       Source row number, 1-based after header.
raw_data                  jsonb          yes       Original parsed row.
normalized_data           jsonb          yes       Normalized import contract fields.
status                    text           yes       See statuses below.
action                    text           no        create | update | skip, selected at review/apply.
error_messages            jsonb          yes       Array of validation errors.
warning_messages          jsonb          yes       Array of warnings.
duplicate_work_id         uuid           no        Exact duplicate target.
conflict_work_ids         uuid[]         no        Possible fuzzy/conflict targets.
dedupe_fingerprint        text           no        Fingerprint calculated from normalized data.
applied_work_id           uuid           no        Created/updated canonical work.
applied_at                timestamptz    no        Apply timestamp.
created_at                timestamptz    yes       Default now().
updated_at                timestamptz    yes       Default now().
────────────────────────────────────────────────────────────────────
```

Row statuses:

```txt
pending
valid
warning
error
duplicate
conflict
applied
skipped
```

### 8.3 Import row contract

Supported import fields:

```txt
code
title
unit
rate
category
subcategory
aliases
keywords
description
included_operations
excluded_operations
price_kind
currency_code
vat_rate
source_name
source_external_row_key
effective_date
```

Required fields:

```txt
title
unit
rate
category
```

Validation and normalization:

- `title` must be trimmed and non-empty;
- `unit` is normalized into `unit_code` and `unit_label`;
- `rate` is parsed into `rate_amount` and must be numeric and non-negative;
- `category` is trimmed and required;
- `currency_code` defaults to the product default if omitted;
- `price_kind` defaults to `base` if omitted;
- `aliases` and `keywords` can be arrays or delimiter-separated strings;
- `source_name + source_external_row_key` is used for repeat-import matching when both are present;
- malformed rows remain in staging with status `error` and must not abort the whole job unless the file itself is unreadable.

Deduplication checks, in order:

```txt
workspace_owner_id + source_name + source_external_row_key
workspace_owner_id + dedupe_fingerprint
workspace_owner_id + normalized_title + unit_code + category
trigram/fuzzy candidates from normalized_title/search_text/aliases
```

No import path may silently merge ambiguous rows. Exact duplicates can be marked as duplicate; fuzzy candidates become conflicts for user review.

---

## 9. Embeddings and AI/hybrid search

Embeddings are stored separately so AI search can evolve without changing canonical work rows.

```txt
TABLE public.directory_work_embeddings
────────────────────────────────────────────────────────────────
Column                  Type           Required  Notes
────────────────────────────────────────────────────────────────
id                      uuid           yes       Primary key.
workspace_owner_id      uuid           yes       Tenant boundary.
work_id                 uuid           yes       FK -> directory_works.id.
model_name              text           yes       Provider/model identifier.
dimensions              integer        yes       Vector dimensions.
content_hash            text           yes       Hash of embedding_input_text + model config.
embedding               vector         no        pgvector column; nullable until generated.
status                  text           yes       pending | ready | stale | failed.
embedding_input_text    text           yes       Denormalized semantic input.
generated_at            timestamptz    no        Last successful generation timestamp.
last_error              text           no        Last generation error.
created_at              timestamptz    yes       Default now().
updated_at              timestamptz    yes       Default now().
────────────────────────────────────────────────────────────────
```

Current AI routes:

```txt
POST /api/directory-works/ai-search
POST /api/directory-works/embeddings/process
```

Current model strategy:

```txt
model_name: text-embedding-3-small
dimensions: 1536
distance operator: cosine via pgvector <=>
default semantic threshold: 0.72
```

Embedding input must include extended work meaning, not just the title:

```txt
title
category
subcategory
aliases
keywords
description
included_operations
excluded_operations
unit_label
price_kind
```

Generation rules:

- create/import does not synchronously call the embedding provider;
- create/import records pending/stale embedding work;
- updates to embedding input fields mark existing embeddings as `stale`;
- failed generation stores `status = failed` and `last_error` for retry/observability;
- AI search filters by current `workspace_owner_id` and excludes deleted/archived works by default;
- provider API keys and source data sent to providers stay server-only;
- embedding processing is bounded by batch limits and is outside CRUD/import transactions;
- update mutations enqueue embedding work inside `update_directory_work_with_embedding(...)`; do not enqueue a second time in the service after update.

AI search request fields:

```txt
query
category?
subcategory?
unit?
limit?
threshold?
```

AI search response includes the work UI fields plus:

```txt
semantic_score
text_score
hybrid_score
match_reason
```

Hybrid ranking combines exact/code boosts, normalized title boosts, alias/keyword boosts, full-text rank, trigram similarity, semantic similarity and category/subcategory boosts. Semantic search must not become the only search mechanism.

---

## 10. Cache and invalidation contract

Server cache tags:

```txt
directory-works:<workspaceOwnerId>
directory-work:<workspaceOwnerId>:<workId>
directory-works-categories:<workspaceOwnerId>
directory-works-import:<workspaceOwnerId>:<jobId>
directory-works-ai:<workspaceOwnerId>:<queryHash>
directory-works-ai-index:<workspaceOwnerId>
```

TanStack Query keys:

```txt
['directoryWorks', params]
['directoryWork', id]
['directoryWorksCategories']
['directoryWorksImportJob', jobId]
['directoryWorksAiSearch', queryHash]
```

Current cache strategy:

- list/search/detail/categories/AI search can use short TTL server caching through workspace-scoped tags;
- mutation, import polling, export and embedding queue paths are cache-bypassed;
- list queries use tuned TanStack Query stale/gc times, focus refetch and placeholder previous data;
- import job detail remains uncached for progress freshness;
- export remains uncached and bounded.

Invalidation rules:

- create/update/archive/delete invalidates list, detail and categories for the affected workspace;
- import job status changes invalidate the import job key only;
- import apply completion invalidates works list, categories and changed detail records;
- embedding generation invalidates AI search only when results can materially change;
- mutation handlers prefer targeted invalidation over global application refetch;
- AI-search invalidation must include the AI search index tag when embeddings or embedding input changes.

Auth-sensitive dynamic endpoints may avoid persistent server caching, but they must still expose a consistent invalidation strategy so CRUD/import/AI phases do not invent incompatible keys.

---

## 11. Indexing, diagnostics and observability

Migrations 010-016 provide the database foundation, regular search RPCs, AI search RPC/vector index, hardening indexes/diagnostics, service-role private-helper grants, the optimized update RPC and large-catalog read/search hardening.

Index families:

```txt
B-tree / partial:
- workspace_owner_id + status + deleted_at
- workspace_owner_id + category + subcategory
- workspace_owner_id + normalized_title
- workspace_owner_id + code where code is not null and deleted_at is null
- workspace_owner_id + source_name + source_external_row_key where source_external_row_key is not null
- workspace_owner_id + dedupe_fingerprint
- workspace_owner_id + updated_at
- work_aliases: workspace_owner_id + work_id + normalized_alias
- work_keywords: workspace_owner_id + work_id + normalized_keyword
- import_jobs: workspace_owner_id + status + created_at
- import_rows: workspace_owner_id + job_id + status

GIN / full-text / trigram:
- directory_works.search_fts
- trigram normalized_title
- trigram search_text
- trigram work_aliases.normalized_alias
- trigram work_keywords.normalized_keyword

Vector:
- directory_work_embeddings.embedding HNSW cosine index for 1536-dimensional embeddings
```

Performance hardening adds partial/composite indexes for active catalog list/search/export, alias/keyword lookups, import job polling/apply and embedding queue maintenance. Migration 016 adds exact-code/source expression indexes and normalized category/unit filter indexes for the 100k-row read/search strategy.

Large-catalog read/search strategy:

- empty `/directories/works` browse requests are handled as an indexed list path, skip relevance ranking, skip alias/keyword aggregation and return only a bounded page plus one sentinel row;
- exact `q=<code>` and `q=<source_external_row_key>` requests use targeted lower-case expression indexes before any fuzzy ranking;
- general text search first builds bounded candidates from title/FTS/trigram, aliases and keywords, then aggregates aliases/keywords only for that candidate set;
- the legacy numeric cursor remains accepted for the UI contract, but interactive offset work is capped at 5,000 rows; deeper extraction must use the bounded export flow or a staged/background job;
- export is still request-lifecycle bounded and reads at most 10,000 rows in 100-row chunks.

Representative non-production load data can be created with `db/scripts/seed-directory-works-load-test.sql`:

```bash
psql "$DATABASE_URL" \
  -v workspace_owner_id='<workspace-owner-id>' \
  -v row_count='100000' \
  -f db/scripts/seed-directory-works-load-test.sql
```

Service-role-only diagnostics:

```txt
explain_directory_works_search_plan(...)
explain_directory_work_categories_plan(...)
get_directory_works_performance_snapshot(...)
```

Runtime observability helpers live in `features/directory-works/server/directory-works.observability.ts` and are intended for lightweight slow-path diagnostics, not a full analytics/audit system.

---

## 12. Security and RLS design

All subsystem tables require RLS.

Read policy:

```txt
authenticated user can read rows where workspace_owner_id belongs to an active workspace_members row for auth.uid()
```

Write policy:

```txt
authenticated owner/admin/manager can write rows for the current workspace_owner_id
```

Implementation notes:

- prefer private helper functions for membership and role checks to avoid policy duplication;
- API repositories still perform server-side permission checks before service-role writes;
- RLS is the last line of defense, not the only authorization layer;
- import and embedding processors must never process rows outside the job's workspace;
- storage paths for import files must be private and workspace-scoped if file persistence is used;
- RPC execute grants for workspace-parameterized search/AI helpers stay restricted and should not allow browser clients to bypass the API boundary;
- `service_role` must have explicit `USAGE` on schema `private` and `EXECUTE` on private helper/trigger functions because server-side writes run after API authorization and fire private trigger functions;
- mutation RPCs such as `update_directory_work_with_embedding(...)` must stay service-role-only and must be called only after application-level authorization.

---

## 13. Validation expectations

For code changes in this subsystem, PRs should report the real state of:

```txt
pnpm typecheck
pnpm build
pnpm lint
pnpm test      # when unit tests are relevant or touched
```

Database changes should also include a Supabase migration smoke test when possible. For migration 013 performance validation, useful checks are:

```sql
select public.explain_directory_works_search_plan('<workspace-owner-id>'::uuid, 'штукатурка');
select public.explain_directory_work_categories_plan('<workspace-owner-id>'::uuid);
select * from public.get_directory_works_performance_snapshot('<workspace-owner-id>'::uuid);
```

For mutation RPC changes, include a smoke test that verifies:

```txt
RPC executes through service_role
browser roles cannot execute it directly
row projection is returned in mapper-compatible shape
version increments
embedding queue state is maintained
```

If local dependency installation or runtime access is unavailable, the PR must say so directly instead of claiming checks passed.
