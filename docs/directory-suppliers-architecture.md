# Directory suppliers architecture

> Last updated: 2026-05-17
>
> Status: first production supplier directory slice with read, write, archive and regular search.
>
> Scope: data model, UI behavior, CRUD boundaries and first-version exclusions for `/directories/suppliers`.

`/directories/suppliers` follows the shared directory standard and uses `/directories/works` as the interaction reference. The suppliers slice is intentionally simpler than works and materials: it keeps supplier-specific fields, routes, messages, validation and storage, but does not include import, export or AI search in the first version.

---

## 1. Current slice

```txt
/directories/suppliers
  -> app/(main)/directories/suppliers/page.tsx
  -> features/directories/components/suppliers-toolbar.tsx
  -> features/directory-suppliers/components/directory-suppliers-view.tsx
  -> features/directory-suppliers/directory-suppliers-details/components/**
  -> features/directory-suppliers/hooks/use-directory-suppliers.ts
  -> features/directory-suppliers/api/**
  -> features/directory-suppliers/lib/**
  -> features/directory-suppliers/server/**
  -> features/directory-suppliers/types.ts
  -> app/api/directory-suppliers/**
  -> db/schema/directory-suppliers.ts
  -> db/migrations/019_directory_suppliers_foundation.sql
```

Implemented capabilities:

```txt
- workspace-scoped list and detail routes;
- regular search through the list route;
- create supplier;
- update supplier;
- archive supplier;
- loading, empty, error and paginated list states;
- supplier-specific toolbar action;
- list refresh after create, update and archive;
- supplier-specific validation and error messages.
```

Not included in the first version:

```txt
- import;
- export;
- AI search;
- complex filters;
- mass actions;
- supplier picker/linking from materials.
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
- regular list/search responses show only active rows by default;
- archive is soft by default.

---

## 3. Canonical table: `directory_suppliers`

`directory_suppliers` stores the production supplier catalog.

```txt
Column              Required  Notes
id                  yes       Primary key.
workspace_owner_id  yes       Tenant boundary.
name                yes       Supplier company name or person name.
normalized_name     yes       Normalized name for simple search and sorting.
legal_status        yes       juridical | individual.
color               yes       UI color, default #64748B.
inn                 no        Tax id, unique inside workspace when present.
phone               no        Phone.
email               no        Email.
address             no        Address.
notes               no        Internal notes.
status              yes       active | archived.
version             yes       Version, starts at 1.
created_by          yes       User who created the row.
updated_by          no        Last user who changed the row.
created_at          yes       Default now().
updated_at          yes       Maintained on write.
archived_at         no        Archive timestamp.
deleted_at          no        Soft-delete timestamp.
```

Required UI projection:

```txt
name         <- directory_suppliers.name
legalStatus  <- directory_suppliers.legal_status
color        <- directory_suppliers.color
inn          <- directory_suppliers.inn
phone        <- directory_suppliers.phone
email        <- directory_suppliers.email
address      <- directory_suppliers.address
notes        <- directory_suppliers.notes
status       <- directory_suppliers.status
version      <- directory_suppliers.version
updatedAt    <- directory_suppliers.updated_at
```

Write rules:

- `name` is trimmed and non-empty;
- `legal_status` is controlled by enum values;
- empty optional text fields are stored as null;
- `email` is stored lowercased when present;
- `color` must be a valid HEX value;
- duplicate non-empty INН inside the same workspace is rejected;
- archive sets `status = archived`, `archived_at`, `updated_by`, `updated_at` and increments `version`;
- physical delete is not the default because suppliers can later be referenced by purchases, materials and documents.

---

## 4. API contract

Regular routes:

```txt
GET    /api/directory-suppliers
POST   /api/directory-suppliers
GET    /api/directory-suppliers/:id
PATCH  /api/directory-suppliers/:id
DELETE /api/directory-suppliers/:id
```

Supported list query parameters:

```txt
q
status
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

Search runs across active suppliers inside the current workspace.

Search fields:

```txt
name / normalized_name
inn
phone
email
```

AI search is intentionally not part of this directory in the first version.

Search resets `cursor` through the shared directories toolbar behavior. Pagination keeps the same query and only changes `cursor`.

---

## 6. UI behavior

The suppliers screen supports:

```txt
loading
empty
error
list
saving
paginated result
```

Required row actions:

```txt
Редактировать
Архивировать
```

`Добавить ниже` is not required for suppliers in the first version because supplier rows are not ordered catalog lines.

Required empty message:

```txt
Поставщики не найдены. Добавьте первого поставщика вручную или измените поиск.
```

Toolbar behavior:

```txt
Поиск поставщиков
Добавить
```

No supplier toolbar action may call works or materials behavior.

---

## 7. First-version readiness checklist

- [x] page follows standard directory wrapper;
- [x] toolbar has supplier-specific search and add action;
- [x] list reads real workspace-scoped data;
- [x] create supplier is connected;
- [x] update supplier is connected;
- [x] archive supplier is connected;
- [x] list refreshes after create, update and archive;
- [x] regular search works through list parameters;
- [x] loading, empty and error states are present;
- [x] temporary mock data is removed from the production flow;
- [x] supplier-specific document exists;
- [x] runtime migration has been applied before production usage.
