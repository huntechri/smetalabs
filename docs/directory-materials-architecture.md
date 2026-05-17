# Directory materials architecture

> Last updated: 2026-05-17
>
> Status: production materials directory slice with read/write/export/import and server-side AI search foundation.
>
> Scope: data model, UI behavior, search, CRUD, import/export boundaries, AI search foundation and remaining rollout items for `/directories/materials`.

`/directories/materials` follows the shared directory standard and uses `/directories/works` as the interaction reference. The materials slice keeps material-specific fields, routes, messages, validation, storage, import/export behavior and AI processing.

---

## 1. Current implemented slice

```txt
/directories/materials
  → app/(main)/directories/materials/page.tsx
  → features/directories/components/materials-toolbar.tsx
  → features/directory-materials/components/directory-materials-view.tsx
  → features/directory-materials/directory-materials-details/components/**
  → features/directory-materials/hooks/use-directory-materials.ts
  → features/directory-materials/api/**
  → features/directory-materials/lib/**
  → features/directory-materials/server/**
  → features/directory-materials/types.ts
  → app/api/directory-materials/**
  → db/schema/directory-materials.ts
  → db/migrations/*directory_materials*.sql
```

Implemented capabilities:

```txt
- workspace-scoped list/detail routes;
- regular search through list/search route behavior;
- categories/filter values route;
- create material;
- update material;
- archive material;
- loading, empty, error and paginated list states;
- material-specific toolbar actions;
- bounded CSV export;
- staged CSV import with preview/apply flow;
- row-level import statuses for valid, warning, error, duplicate, conflict and applied rows;
- list/categories refresh after mutations and import apply;
- server-side AI data queue for created, updated and imported materials;
- server-side AI data processing route;
- material-only hybrid AI search route over prepared material embeddings.
```

Remaining follow-up items:

```txt
- UI entry for AI search if product requires it;
- deeper performance hardening for very large material catalogs;
- optional supplier directory linking beyond denormalized supplier display name;
- XLSX export if product scope requires it.
```

---

## 2. Tenant boundary and access

The tenant boundary is the current workspace owner id:

```txt
workspace_owner_id = workspace_members.owner_id
```

Rules:

- the client never sends `workspace_owner_id` as an authority source;
- API routes resolve the current workspace on the server side;
- reads require an authenticated user with access to the current workspace;
- writes require one of the current write roles: `owner`, `admin`, `manager`;
- regular list/search responses show only active, non-deleted materials by default;
- archive is soft by default;
- service-role database access is used only server-side after application-level authorization;
- AI provider keys are server-only.

---

## 3. Canonical table: `directory_materials`

`directory_materials` stores the production material catalog.

```txt
Column                    Required  Notes
──────────────────────────────────────────────────────────────
id                        yes       Primary key.
workspace_owner_id        yes       Tenant boundary.
name                      yes       Human-readable material name.
normalized_name           yes       Backend-normalized name for exact/prefix/fuzzy matching.
unit_code                 yes       Canonical unit code.
unit_label                yes       Display unit label.
price_amount              yes       Non-negative material price.
currency_code             yes       Default RUB unless product config changes.
category                  yes       Main group for UI/search/filtering.
subcategory               no        Optional nested group.
code                      no        Workspace-scoped material code/SKU.
supplier_name             no        Optional denormalized supplier display name.
supplier_id               no        Optional future link to supplier directory row.
image_url                 no        Optional material image URL.
description               no        Searchable long description.
source_name               no        External catalog/source name.
source_external_row_key   no        External row id/code for repeated imports.
dedupe_fingerprint        yes       Stable normalized fingerprint for duplicate detection.
search_text               yes       Denormalized search document.
search_fts                yes       Full-text vector.
status                    yes       active | archived.
version                   yes       Optimistic version, starts at 1.
created_by                yes       Auth user who created the row.
updated_by                no        Last auth user who changed the row.
created_at                yes       Default now().
updated_at                yes       Maintained on write.
archived_at               no        Archive timestamp.
deleted_at                no        Soft-delete timestamp.
```

Required UI projection:

```txt
code        <- directory_materials.code
name        <- directory_materials.name
unit        <- directory_materials.unit_label or unit_code
price       <- directory_materials.price_amount + currency_code
category    <- directory_materials.category
supplier    <- directory_materials.supplier_name
imageUrl    <- directory_materials.image_url
status      <- directory_materials.status
version     <- directory_materials.version
updatedAt   <- directory_materials.updated_at
```

Canonical write rules:

- `name` is trimmed and non-empty;
- `price_amount >= 0`;
- `category` is required for production data;
- `unit_code` is normalized from the provided unit text;
- search and duplicate helper fields are recalculated by database helpers;
- canonical rows are not created from empty UI draft rows;
- archive sets `status = archived`, `archived_at`, `updated_by`, `updated_at` and increments `version`;
- physical delete is not the default because materials can be referenced by estimates, purchases, documents and templates.

---

## 4. API contract

Regular routes:

```txt
GET    /api/directory-materials
POST   /api/directory-materials
GET    /api/directory-materials/search
GET    /api/directory-materials/categories
GET    /api/directory-materials/:id
PATCH  /api/directory-materials/:id
DELETE /api/directory-materials/:id
```

Import/export routes:

```txt
POST /api/directory-materials/import-jobs
GET  /api/directory-materials/import-jobs/:id
POST /api/directory-materials/import-jobs/:id/apply
GET  /api/directory-materials/export
```

AI routes:

```txt
POST /api/directory-materials/embeddings/process
POST /api/directory-materials/ai-search
```

Supported list query parameters:

```txt
q
category
subcategory
unit
status
supplier
limit
cursor
sort
```

Defaults:

```txt
status = active
limit = 50
cursor = 0
sort = relevance
```

Default filters:

```txt
workspace_owner_id = current workspace owner id
status = active
deleted_at is null
```

---

## 5. Search behavior

Search runs across active materials inside the current workspace, not only visible browser rows.

A multi-word query is treated as separate words that must all be present somewhere in searchable material fields. For example, `штукатурка ротбанд` matches `Штукатурка гипсовая Knauf Ротбанд 5 кг`, even though the words are not adjacent.

Regular ranking intent:

```txt
1. exact code or source_external_row_key match
2. exact normalized_name match
3. normalized_name prefix match
4. all query words present across name/search text/code/supplier/source key
5. supplier/category/subcategory match
6. recent update tie-breaker after relevance
```

AI search uses the same workspace boundary and active/non-deleted filters. Hybrid ranking combines semantic score with text score, so exact code/name/source matches remain strong and semantic matching does not replace normal search.

Search and filters reset `cursor`. Pagination keeps the same filters/query and only changes `cursor`.

---

## 6. UI behavior

The materials screen supports:

```txt
loading
empty
error
list
saving
importing
paginated result
```

Required row actions:

```txt
Добавить ниже
Редактировать
Архивировать
```

Required empty message:

```txt
Материалы не найдены. Добавьте первый материал вручную или измените поиск.
```

Toolbar behavior:

```txt
Поиск материалов
Добавить
Импорт
Экспорт
```

No material toolbar action may call works-specific behavior.

---

## 7. Staged import

Import is staged and material-specific. Raw uploaded rows are not written directly into `directory_materials`.

Flow:

```txt
select CSV file
→ browser parses CSV headers/rows
→ POST /api/directory-materials/import-jobs
→ server normalizes rows
→ server validates rows
→ server detects duplicate/conflict rows
→ preview is stored in import tables
→ user reviews preview
→ POST /api/directory-materials/import-jobs/:id/apply
→ only valid/warning create rows are inserted into directory_materials
→ invalid, duplicate and conflict rows stay out of canonical data
→ list/categories/export data refreshes
→ created material ids are queued for AI data preparation
```

Supported import fields:

```txt
code
name
unit
price
category
subcategory
supplierName
imageUrl
description
currencyCode
sourceName
sourceExternalRowKey
```

CSV header aliases include both English and Russian variants, for example:

```txt
name/title/название/наименование
unit/единица
price/rate/цена
category/категория
supplier/supplier_name/поставщик
source_name/источник
```

Minimum validation:

- material name is required;
- unit is required;
- category is required;
- price must be a non-negative number;
- currency code must use three uppercase letters;
- import body is limited to 1000 rows per job.

Duplicate and conflict handling:

```txt
same file fingerprint               → duplicate, skipped
existing code match                 → duplicate, skipped
existing source row key match       → duplicate, skipped
existing dedupe fingerprint match   → duplicate, skipped
same normalized name + unit         → conflict, skipped
valid/warning row                   → create, allowed to apply
error row                           → skipped
```

Import storage:

```txt
directory_material_import_jobs
directory_material_import_rows
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

---

## 8. Export

Export is material-specific and does not use works export builders.

Current format:

```txt
csv
```

Export behavior:

- uses current list filters/search when possible;
- no selected category/subcategory exports the active material directory up to the export cap;
- selected category exports only that category;
- selected category and subcategory exports only that subcategory inside that category;
- resets cursor and ignores browser page size;
- collects rows in server-side batches of 500;
- is bounded by `MAX_EXPORT_ROWS = 100000`;
- uses UTF-8 BOM;
- emits material columns and labels.

CSV columns:

```txt
Код
Название
Ед. изм.
Цена
Валюта
Категория
Подкатегория
Поставщик
Статус
Обновлено
```

---

## 9. Cache and refresh behavior

After create, update, archive or import apply, refresh:

```txt
list
one row when affected
filters/categories
import job detail when applicable
AI search index tag
```

TanStack Query keys:

```txt
['directoryMaterials']
['directoryMaterials', 'list', params]
['directoryMaterials', 'detail', id]
['directoryMaterials', 'categories']
['directoryMaterials', 'importJob', id]
```

Server cache tags:

```txt
directory-materials:<workspaceOwnerId>
directory-material:<workspaceOwnerId>:<materialId>
directory-materials-categories:<workspaceOwnerId>
directory-materials-import:<workspaceOwnerId>:<jobId>
directory-materials-ai-index:<workspaceOwnerId>
```

---

## 10. AI search and data preparation

AI search uses `directory_material_embeddings` and the material-only SQL function `public.search_directory_materials_ai(...)`.

Current model strategy:

```txt
model_name: text-embedding-3-small
dimensions: 1536
server env: OPENAI_API_KEY
```

AI data input includes:

```txt
name
code
category
subcategory
unit_label / unit_code
price_amount + currency_code
supplier_name
description
```

Material changes enqueue AI preparation:

```txt
create material
update material
import apply for newly created material ids
```

Processing behavior:

```txt
POST /api/directory-materials/embeddings/process
→ requires owner/admin/manager write access
→ prepares pending material rows in bounded batches
→ calls provider only server-side
→ stores ready/failed status on directory_material_embeddings
```

Search behavior:

```txt
POST /api/directory-materials/ai-search
→ requires read access
→ creates query embedding server-side
→ filters by current workspace
→ excludes archived/deleted materials
→ returns material fields plus semantic_score, text_score, hybrid_score and match_reason
```

AI search must not become the only search mechanism. Normal list/search remains the default visible flow unless the product UI explicitly adds an AI entry.

---

## 11. Production readiness checklist

Page and UI:

- [x] page uses the standard directory page wrapper;
- [x] toolbar has correct material labels and actions;
- [x] list shows loading state;
- [x] list shows empty state;
- [x] list shows error state;
- [x] list supports pagination;
- [x] row actions are material-specific;
- [x] add dialog works;
- [x] edit dialog works;
- [x] archive action works;
- [x] import dialog works with staged preview/apply;
- [x] export action is material-specific;
- [ ] debug borders are removed if any remain after visual QA.

Backend:

- [x] list route is implemented;
- [x] detail route is implemented;
- [x] create route is implemented;
- [x] update route is implemented;
- [x] archive route is implemented;
- [x] categories/filter route is implemented;
- [x] import routes are implemented;
- [x] export route is implemented;
- [x] AI routes are implemented;
- [x] embedding processor is implemented;
- [x] all writes check permissions;
- [x] all reads check workspace access;
- [x] client cannot set workspace owner directly;
- [x] normal reads exclude archived/deleted rows by default.

Data:

- [x] table has workspace boundary;
- [x] table has status/lifecycle fields;
- [x] import staging tables exist;
- [x] required fields are validated;
- [x] duplicate rules are implemented for code/source/fingerprint/name+unit;
- [x] archive is soft by default;
- [x] export columns match materials;
- [x] embedding processor is connected.

Quality:

- [x] no mocks remain in production flow;
- [x] no copied works route remains by accident;
- [x] no copied works text remains in user-facing materials import/export flow;
- [x] list refreshes after create/update/archive/import;
- [x] errors are understandable to the user;
- [x] docs/filemap.md is updated.
