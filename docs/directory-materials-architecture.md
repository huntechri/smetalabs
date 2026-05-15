# Directory materials architecture

> Last updated: 2026-05-15
>
> Status: planned production backend/UI contract for `/directories/materials`.
>
> Scope: data model, UI behavior, search, CRUD, import/export boundaries and rollout order for the materials catalog.

This document fixes the first contract for moving `/directories/materials` from mock-backed UI to a production workspace-scoped directory section.

The current materials page already follows the top-level directory screen shape, but the data flow is still mock-based. This contract defines the target slice before database, API and UI integration work starts.

`/directories/works` remains the reference implementation. Materials must copy the interaction model and safety rules, but keep material-specific fields, route names, messages, database tables, import/export columns and validation.

---

## 1. Current state

Current implemented slice:

```txt
/directories/materials
  → app/(main)/directories/materials/page.tsx
  → features/directories/components/materials-toolbar.tsx
  → features/directory-materials/components/directory-materials-view.tsx
  → features/directory-materials/directory-materials-details/components/**
  → features/directory-materials/hooks/use-directory-materials.ts
  → features/directory-materials/__mocks__/directory-materials.ts
  → types/directory-material.ts
```

Known gaps:

```txt
- no database table yet;
- no `/api/directory-materials` routes yet;
- no feature API client/query keys yet;
- no server repository/service yet;
- list data comes from `__mocks__`;
- add/import/export toolbar actions are not wired to material-specific behavior;
- no loading, empty, error or pagination states;
- no create/edit/archive flow;
- no workspace-scoped read/write checks;
- no import/export implementation.
```

---

## 2. Target ownership map

Production materials should own this slice:

```txt
/directories/materials
  → app/(main)/directories/materials/page.tsx
  → features/directories/components/materials-toolbar.tsx
  → features/directory-materials/components/directory-materials-view.tsx
  → features/directory-materials/directory-materials-details/components/**
  → features/directory-materials/hooks/**
  → features/directory-materials/api/**
  → features/directory-materials/server/**
  → features/directory-materials/types.ts
  → app/api/directory-materials/**
  → db/schema/directory-materials.ts
  → db/migrations/*directory_materials*.sql
```

Feature responsibilities:

- `features/directory-materials/api/**` owns client fetchers, errors, mappers and query keys.
- `features/directory-materials/hooks/**` owns server-state loading, mutations and refresh behavior.
- `features/directory-materials/server/**` owns validation, permission checks, repository/service logic, search, import and export.
- `app/api/directory-materials/**` owns HTTP route boundaries and delegates to the feature server layer.
- `db/schema/directory-materials.ts` and migrations own the database contract.

UI components must not own database logic, permission checks, import apply logic or export builders.

---

## 3. Tenant boundary and access

The tenant boundary is the current workspace owner id:

```txt
workspace_owner_id = workspace_members.owner_id
```

Rules:

- the client must never send `workspace_owner_id` as an authority source;
- API routes resolve the current workspace on the server side;
- reads require an authenticated user with access to the current workspace;
- writes require one of the current write roles: `owner`, `admin`, `manager`;
- regular list/search responses show only active, non-deleted materials by default;
- archive is soft by default;
- service-role database access, if used, must happen only after application-level authorization.

---

## 4. Canonical table: `directory_materials`

Target canonical row shape:

```txt
TABLE public.directory_materials
──────────────────────────────────────────────────────────────
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
supplier_name             no        Optional denormalized supplier display name for catalog rows.
supplier_id               no        Optional link to a supplier directory row when available.
image_url                 no        Optional material image URL.
description               no        Searchable long description.
source_name               no        External catalog/source name.
source_external_row_key   no        External row id/code for repeated imports.
dedupe_fingerprint        yes       Stable normalized fingerprint for duplicate detection.
search_text               yes       Denormalized search document.
search_fts                yes       Full-text vector when implemented by migration.
status                    yes       active | archived.
version                   yes       Optimistic version, starts at 1.
created_by                yes       Auth user who created the row.
updated_by                no        Last auth user who changed the row.
created_at                yes       Default now().
updated_at                yes       Maintained on write.
archived_at               no        Archive timestamp.
deleted_at                no        Soft-delete timestamp.
──────────────────────────────────────────────────────────────
```

Required UI projection:

```txt
code        <- directory_materials.code
name        <- directory_materials.name
unit        <- directory_materials.unit_label or unit_code
price       <- directory_materials.price_amount + currency_code
category    <- directory_materials.category
supplier    <- directory_materials.supplier_name or linked supplier name, when present
imageUrl    <- directory_materials.image_url, when present
status      <- directory_materials.status
version     <- directory_materials.version
updatedAt   <- directory_materials.updated_at
```

Canonical write rules:

- `name` is trimmed and non-empty;
- `normalized_name` is generated by backend/database normalization, not accepted directly from UI;
- `price_amount >= 0`;
- `category` is required for production data;
- `unit_code` is normalized from controlled values or approved free-text mapping;
- `dedupe_fingerprint` is recalculated on create/update/import apply;
- `search_text` and `search_fts` are recalculated on create/update/import apply;
- canonical rows are not created from empty UI draft rows;
- archive sets `status = archived`, `archived_at`, `updated_by`, `updated_at` and increments `version`;
- physical delete is not the default because materials can be referenced by estimates, purchases, documents and templates.

Supported canonical `status` values:

```txt
active
archived
```

---

## 5. API contract

Target regular routes:

```txt
GET    /api/directory-materials
POST   /api/directory-materials
GET    /api/directory-materials/search
GET    /api/directory-materials/categories
GET    /api/directory-materials/:id
PATCH  /api/directory-materials/:id
DELETE /api/directory-materials/:id
```

Import/export routes, when enabled:

```txt
POST /api/directory-materials/import-jobs
GET  /api/directory-materials/import-jobs/:id
POST /api/directory-materials/import-jobs/:id/apply
GET  /api/directory-materials/export
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
sort = relevance or updated_desc for browse mode
```

Default filters:

```txt
workspace_owner_id = current workspace owner id
status = active
deleted_at is null
```

The API must return UI fields plus metadata needed for editing and stale-write protection.

---

## 6. Search behavior

Search must run across all active materials inside the current workspace, not only the rows currently visible in the browser.

Ranking intent:

```txt
1. exact code or source_external_row_key match
2. exact normalized_name match
3. normalized_name prefix match
4. supplier/category/subcategory exact or prefix match
5. weighted full-text rank over search_fts
6. trigram/fuzzy similarity over normalized_name/search_text
7. recent update/version tie-breakers only after relevance
```

Search and filters must reset `cursor` when changed. Pagination must keep the same filters/query and only move `cursor`.

AI search is not part of the first production materials slice.

---

## 7. UI behavior

The materials screen must support:

```txt
loading
empty
error
list
saving
importing when import is enabled
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

Toolbar requirements:

- search placeholder: `Поиск материалов`;
- add action opens a material form;
- import/export actions are hidden or disabled until material-specific routes are implemented;
- no toolbar action may call works-specific behavior.

Visual cleanup required before production-ready status:

- remove debug dashed colored borders from materials rows/view;
- use the same spacing and semantic border tokens as the works reference;
- use shadcn/ui primitives directly from `@/components/ui/*`.

---

## 8. Validation and duplicate rules

Minimum validation:

- required text fields are trimmed and non-empty;
- numeric values are parsed and bounded;
- price cannot be negative;
- status values are controlled;
- client-provided workspace identifiers are ignored;
- duplicate detection uses normalized name, unit, category, supplier/source and optional code;
- validation messages must name materials, not works.

Duplicate handling:

```txt
exact code duplicate              → reject or show conflict
same normalized name + unit       → warning/conflict depending on category/supplier
same source row key               → update/match candidate in import flow
```

---

## 9. Import/export boundary

Import is not required for the first materials implementation. If enabled, it must be staged.

Required import flow:

```txt
upload/select source
→ create import job
→ parse rows
→ normalize rows
→ validate rows
→ detect duplicates/conflicts
→ show preview
→ user confirms
→ apply valid selected rows
→ refresh list/search/export data
```

Import must not write raw uploaded rows directly into `directory_materials`.

Export, when enabled, must:

- use the same filters as the current list when possible;
- support bounded CSV/XLSX output;
- use material-specific columns and labels;
- not call works export builders.

---

## 10. Cache and refresh behavior

After create, update, archive or import apply, refresh:

```txt
list
one row
filters/categories
search results
import job detail when applicable
```

Recommended TanStack Query keys:

```txt
['directoryMaterials', params]
['directoryMaterial', id]
['directoryMaterialsCategories']
```

Recommended server cache tags when applicable:

```txt
directory-materials:<workspaceOwnerId>
directory-material:<workspaceOwnerId>:<materialId>
directory-materials-categories:<workspaceOwnerId>
```

Do not leave stale material rows visible after a successful mutation.

---

## 11. Rollout order

Use this order:

```txt
1. Contract document.
2. Database structure.
3. Read/list route.
4. UI connected to real list data.
5. Create/edit/archive.
6. Filters/search.
7. Export.
8. Import when product scope requires it.
9. Performance and refresh hardening.
10. Final cleanup and checklist.
```

Minimum first production result:

```txt
- page opens;
- data is loaded from database;
- search works;
- loading state exists;
- empty state exists;
- error state exists;
- create material works;
- edit material works;
- archive material works;
- mock data is removed from production flow.
```

---

## 12. Non-goals for the first implementation

```txt
AI search
embeddings
mass operations
supplier directory rebuild
purchase flow integration
estimate material picker refactor
unbounded export
raw import directly into canonical rows
```

Import/export may remain hidden or disabled until material-specific routes are implemented.

---

## 13. Production readiness checklist

Page and UI:

- [ ] page uses the standard directory page wrapper;
- [ ] toolbar has correct material labels and actions;
- [ ] list shows loading state;
- [ ] list shows empty state;
- [ ] list shows error state;
- [ ] list supports pagination;
- [ ] row actions are material-specific;
- [ ] add dialog works;
- [ ] edit dialog works;
- [ ] archive action works;
- [ ] unfinished actions are hidden or disabled;
- [ ] debug borders are removed.

Backend:

- [ ] list route is implemented;
- [ ] detail route is implemented;
- [ ] create route is implemented;
- [ ] update route is implemented;
- [ ] archive route is implemented;
- [ ] categories/filter route is implemented;
- [ ] import routes are implemented when import is enabled;
- [ ] export route is implemented when export is enabled;
- [ ] all writes check permissions;
- [ ] all reads check workspace access;
- [ ] client cannot set workspace owner directly;
- [ ] normal reads exclude archived/deleted rows by default.

Data:

- [ ] table has workspace boundary;
- [ ] table has status/lifecycle fields;
- [ ] required fields are validated;
- [ ] duplicate rules are implemented;
- [ ] archive is soft by default;
- [ ] import staging tables exist when import is enabled;
- [ ] export columns match materials.

Quality:

- [ ] no mocks remain in production flow;
- [ ] no copied works route remains by accident;
- [ ] no copied works text remains by accident;
- [ ] list refreshes after create/update/archive/import;
- [ ] errors are understandable to the user;
- [ ] docs/filemap.md is updated.
