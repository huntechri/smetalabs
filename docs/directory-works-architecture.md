# Directory works architecture

> Status: contract for issue #65, part of epic #64.
> Scope: backend/DB/search/import/cache architecture for `/directories/works`.
> Non-goal: this document does not create migrations, API routes, UI bindings, import processors or embedding jobs.

This document fixes the production contract for the works directory before DB foundation, read API, CRUD, import/export, embeddings and performance phases are implemented. The current UI may continue to show only `Название / Ед. изм. / Расценка / Категория`, but the backend contract must preserve enough structured data for tenant isolation, import staging, deduplication, full-text/fuzzy search, semantic search and targeted cache invalidation.

---

## 1. Ownership and tenant boundary

The tenant boundary for the subsystem is `workspace_owner_id`.

```txt
workspace_owner_id = workspace_members.owner_id
```

Rules:

- every canonical, supporting, import and embedding table stores `workspace_owner_id` as a required column;
- API routes, server actions and repositories must resolve the current workspace server-side through the authenticated user and the existing workspace helper layer;
- clients must never provide `workspace_owner_id` as an authority source;
- RLS policies and private DB helpers must filter by `workspace_owner_id` and authenticated membership;
- service-role access is allowed only server-side after an explicit permission check;
- rows from archived/deleted works must not appear in normal list/search responses unless a route explicitly asks for them and the user has sufficient permission.

The existing implicit workspace model is based on owner-owned workspaces rather than a separate `workspaces` table. This contract therefore avoids introducing a new global workspace entity.

---

## 2. Canonical table: `directory_works`

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
status                    text                    yes       active | archived. draft only if a draft persistence strategy is accepted.
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
- physical deletion is not the default because works can be referenced by estimates/templates.

Suggested `price_kind` values:

```txt
base
labor
turnkey
estimate
custom
```

Suggested `status` values for canonical rows:

```txt
active
archived
```

`draft` is intentionally excluded until a separate draft persistence strategy is accepted. UI drafts should remain client-local or form-local in the initial CRUD phase.

---

## 3. Supporting tables

### 3.1 `work_aliases`

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
- duplicate aliases should be unique per `workspace_owner_id + work_id + normalized_alias` where `deleted_at is null`.

### 3.2 `work_keywords`

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
- duplicate keywords should be unique per `workspace_owner_id + work_id + normalized_keyword` where `deleted_at is null`;
- keywords are weighted lower than exact code/title matches but higher than generic description matches.

---

## 4. Import staging tables

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

### 4.1 `directory_work_import_jobs`

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
total_rows            integer        yes       Default 0.
parsed_rows           integer        yes       Default 0.
valid_rows            integer        yes       Default 0.
warning_rows          integer        yes       Default 0.
error_rows            integer        yes       Default 0.
duplicate_rows        integer        yes       Default 0.
conflict_rows         integer        yes       Default 0.
applied_rows          integer        yes       Default 0.
skipped_rows          integer        yes       Default 0.
options               jsonb          yes       Parser/apply options.
summary               jsonb          yes       Preview/apply summary.
last_error            text           no        Last processing error.
started_at            timestamptz    no        Processing start.
completed_at          timestamptz    no        Processing completion.
created_at            timestamptz    yes       Default now().
updated_at            timestamptz    yes       Default now().
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

### 4.2 `directory_work_import_rows`

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

Import confirmation must support `create` and `skip` initially. `update existing` can be added after conflict review UX is explicit enough to avoid silent merges.

---

## 5. Import row contract

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

## 6. Embedding table

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

Embedding input must include the extended work meaning, not just the title:

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

- create/import does not synchronously call an embedding provider;
- create/import marks embedding work as `pending` or enqueues a background job;
- updates to embedding input fields mark existing embeddings as `stale`;
- failed generation stores `status = failed` and `last_error` for retry/observability;
- AI search filters by current `workspace_owner_id` and excludes deleted/archived works by default;
- provider API keys and source data sent to providers stay server-only.

The concrete model name, dimensions, distance operator and HNSW index parameters are finalized in the AI/hybrid search phase.

---

## 7. Search contract

Production search is hybrid, but it has two distinct modes:

1. regular text search: exact, normalized, full-text, trigram/fuzzy;
2. AI/semantic search: embedding similarity plus regular text boosts.

The regular read/search API is implemented before AI search.

### 7.1 Regular search inputs

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

The API should return UI fields plus minimal metadata needed for future editing:

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

### 7.2 Ranking order

Recommended text ranking order:

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

### 7.3 AI and hybrid search

Recommended endpoint for semantic mode:

```txt
POST /api/directory-works/ai-search
```

Request:

```txt
query
category?
subcategory?
unit?
limit?
threshold?
```

Response fields:

```txt
work UI fields
semantic_score
text_score
hybrid_score
match_reason
```

Hybrid ranking combines:

```txt
exact/code boost
normalized title boost
alias/keyword boost
full-text rank
trigram similarity
semantic similarity
category/subcategory boost
```

Semantic search must not become the only search mechanism. Exact and high-confidence text matches are returned before lower-confidence semantic matches.

---

## 8. Cache and invalidation contract

Server cache tags:

```txt
directory-works:<workspaceOwnerId>
directory-work:<workspaceOwnerId>:<workId>
directory-works-categories:<workspaceOwnerId>
directory-works-import:<workspaceOwnerId>:<jobId>
directory-works-ai:<workspaceOwnerId>:<queryHash>
```

TanStack Query keys:

```txt
['directoryWorks', params]
['directoryWork', id]
['directoryWorksCategories']
['directoryWorksImportJob', jobId]
['directoryWorksAiSearch', queryHash]
```

Invalidation rules:

- create/update/archive/delete invalidates list, detail and categories for the affected workspace;
- import job status changes invalidate the import job key only;
- import apply completion invalidates the works list, categories and changed detail records;
- embedding generation changes invalidate AI search only when results can materially change;
- mutation handlers should prefer targeted invalidation over global application refetch.

Auth-sensitive dynamic endpoints may avoid persistent server caching, but they must still expose a consistent invalidation strategy so the CRUD/import phases do not invent incompatible keys.

---

## 9. Conceptual indexes

The DB foundation phase should translate these into concrete SQL/Drizzle definitions.

B-tree / partial indexes:

```txt
workspace_owner_id + status + deleted_at
workspace_owner_id + category + subcategory
workspace_owner_id + normalized_title
workspace_owner_id + code where code is not null and deleted_at is null
workspace_owner_id + source_name + source_external_row_key where source_external_row_key is not null
workspace_owner_id + dedupe_fingerprint
workspace_owner_id + updated_at
work_aliases: workspace_owner_id + work_id + normalized_alias
work_keywords: workspace_owner_id + work_id + normalized_keyword
import_jobs: workspace_owner_id + status + created_at
import_rows: workspace_owner_id + job_id + status
```

GIN / full-text / trigram:

```txt
directory_works.search_fts
trigram normalized_title
trigram search_text
trigram work_aliases.normalized_alias
trigram work_keywords.normalized_keyword
```

Vector indexes:

```txt
directory_work_embeddings.embedding HNSW or IVFFLAT after model/dimensions are fixed
```

Do not add expensive vector index parameters until the AI phase fixes model dimensions and expected data volume.

---

## 10. Security and RLS design

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
- storage paths for import files must be private and workspace-scoped if file persistence is used.

---

## 11. Phase boundaries

This contract enables the following sequence:

```txt
#65 contract/documentation
#66 DB foundation: schema, migration, RLS, indexes
#67 read API and regular search
#68 UI backend integration and manual CRUD
#69 import/export via staging jobs
#70 embeddings and AI/hybrid search
#71 cache/indexing/performance hardening
```

Strict non-goals for this contract phase:

- no migrations;
- no Supabase production DB changes;
- no route handlers/server actions;
- no UI changes;
- no replacement of mocks;
- no import/export implementation;
- no embedding generation;
- no work on notification architecture (#56);
- no broad component/hook refactor (#57).
