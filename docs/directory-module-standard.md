# Directory module standard

> Last updated: 2026-05-17
>
> Status: project standard for building new `/directories/*` sections.
>
> Base reference: `/directories/works`.

This document defines the standard for every directory section in Smetalabs. A directory section is not only a UI page. It must include the full product slice: page, toolbar, list, row actions, data loading, write actions, permissions, import, export, errors, empty states, and backend storage rules.

`/directories/works` is the current reference implementation. New directory sections should follow its structure and behavior unless a product decision explicitly says otherwise.

---

## 1. Goal

Every directory section must feel and behave like part of the same product.

When we build materials, suppliers, counterparties, equipment, or any future directory, users should not need to learn a new interaction model. The layout, actions, loading behavior, error handling, import/export flow, access checks, and data boundaries should be consistent.

The goal is reuse with discipline:

- reuse the proven structure from `/directories/works`;
- keep each directory's business fields and rules separate;
- avoid one oversized universal component that hides domain differences;
- avoid unfinished copy-paste where old `works` names, routes, messages, or data connections remain.

---

## 2. Reference slice

The reference slice is:

```txt
/directories/works
  → app/(main)/directories/works/page.tsx
  → features/directories/components/works-toolbar.tsx
  → features/directory-works/components/directory-works-view.tsx
  → features/directory-works/directory-works-details/components/**
  → features/directory-works/hooks/**
  → features/directory-works/api/**
  → app/api/directory-works/**
  → features/directory-works/server/**
  → db/schema/directory-works.ts
  → db/migrations/*directory_works*.sql
```

A new directory should have the same kind of ownership map. For example, a materials section should have an equivalent materials slice instead of depending on works-specific files.

---

## 3. Required page structure

Each directory page must stay thin.

Required shape:

```txt
app/(main)/directories/<directory>/page.tsx
  → <DirectoryToolbar />
  → <DirectoryView />
```

The page file should only compose the screen. It should not contain data loading, permissions, import logic, export logic, or mutation logic.

The page wrapper should follow the same spacing and height behavior as `/directories/works`, so all directories align visually inside the main application shell.

---

## 4. Required UI behavior

Each directory must support these screen states:

```txt
loading
empty
error
list
saving
importing
paginated result
```

The section must show:

- a loading placeholder while data is loading;
- a clear empty message when no rows are found;
- a clear error message when an operation fails;
- a consistent list layout;
- disabled actions while a write operation is running;
- pagination controls when the list response has more rows.

The empty message should be specific to the directory. Example:

```txt
Материалы не найдены. Добавьте первый материал вручную или измените поиск.
```

Do not leave generic works-specific text in copied sections.

---

## 5. Required toolbar behavior

Each directory toolbar must use the shared directory toolbar pattern.

Required capabilities:

```txt
search
filter toggle when filters exist
add
import when supported
export when supported
```

The toolbar must keep search in the URL query using `q`, and search submit should reset pagination.

Directory-specific toolbar labels must be localized and precise:

```txt
Поиск работ
Поиск материалов
Поиск поставщиков
Поиск контрагентов
```

Actions that are not ready must be hidden or disabled. They must not call another directory's behavior.

---

## 6. Required row behavior

Each row must show the most important fields for that directory and expose consistent row actions.

Default row actions:

```txt
Добавить ниже
Редактировать
Архивировать
```

Use the same action names across directories unless the product decision requires a different verb.

Rows should follow this visual model:

```txt
left side   → identity fields, such as code/name/title
right side  → key metrics or classification
end action  → row menu
```

Examples:

```txt
Works:       code, title, unit, rate, category
Materials:   code, name, unit, price, category/supplier
Suppliers:   name, contact, status, category
Counterparties: name, type, contact, status
```

The row component should stay specific to its directory. Do not force all directories into a single row component if their fields differ.

---

## 7. Required URL query contract

Directory list pages should use a consistent query pattern.

Common query keys:

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

A directory may add extra filters when required, but common filters should keep the same names where they mean the same thing.

Default behavior:

```txt
status = active
limit = 50
cursor = 0
sort = relevance or directory-specific default
```

Changing search or filters should reset `cursor`.

---

## 8. Required backend behavior

Every production directory must have its own backend slice.

Required capabilities:

```txt
list rows
get one row
create row
update row
archive row
get filter values when needed
import preview when import is supported
apply import when import is supported
export when export is supported
```

The backend must be directory-specific, not reused by accident from another directory.

For example, materials must not call works routes, works repositories, works import jobs, or works export builders.

---

## 9. Required access rules

Every directory must resolve the current workspace on the server side.

Rules:

- the client must not decide the workspace owner;
- read operations require an authenticated user with access to the workspace;
- write operations require a role allowed to change directory data;
- normal list/search responses must exclude archived or deleted rows unless the route explicitly asks for them;
- server-only privileged access must happen only after permission checks.

The current reference role set for writes is:

```txt
owner
admin
manager
```

If a directory needs a stricter rule, document it in that directory's own contract.

---

## 10. Required data model rules

Every directory table must include a workspace boundary field.

Required row lifecycle fields should include equivalents of:

```txt
id
workspace_owner_id
status
created_by
updated_by
created_at
updated_at
archived_at
deleted_at
```

Every directory should support soft archive by default. Physical deletion should not be the default because directory rows may be referenced by estimates, templates, orders, or documents.

Each directory should define its own required business fields. Examples:

```txt
Works: title, unit, rate, category
Materials: name, unit, price, category
Suppliers: name, contact/status fields
Counterparties: name, legal/contact fields
```

---

## 11. Required validation rules

Every create/update/import path must validate input before writing.

Minimum validation expectations:

- required text fields must be trimmed and non-empty;
- numeric values must be parsed and bounded;
- status values must be controlled;
- user-provided workspace identifiers must be ignored;
- duplicate detection must be implemented where repeated catalog entries are possible;
- import rows with errors must not silently create broken production data.

Validation messages must name the current directory, not the copied source directory.

---

## 12. Required import behavior

Import must be staged when supported.

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

Import must not write raw uploaded rows directly into canonical directory tables.

Import must support row-level status:

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

A malformed row should not break the entire import unless the file itself cannot be read.

---

## 13. Required export behavior

Export must use the same filters as the current list when possible.

Expected behavior:

```txt
no selected category/subcategory  → export the active directory within the export cap
selected category                 → export only that category
selected category + subcategory   → export only that subcategory inside that category
other active filters/search       → apply the same filters/search to export
```

The export action should drop browser pagination values such as `cursor` and page-size `limit`. The server should collect matching rows in bounded batches until the export cap is reached or no more rows remain.

Required export formats should be chosen per directory, but default expected formats are:

```txt
csv
xlsx
```

Export must be bounded. It should not attempt to dump unlimited data without an explicit product decision.

Export output must use directory-specific columns and labels.

---

## 14. Required search behavior

Every directory must support normal search through the list route or a dedicated search route.

Search should prioritize exact and obvious matches above weak matches.

Default ranking intent:

```txt
exact code/id match
exact name/title match
prefix name/title match
alias/keyword match when supported
full text match when supported
fuzzy match when supported
recent update tie-breaker
```

If AI search is added, it must not outrank exact code/name matches in normal user flows.

---

## 15. Required cache and refresh behavior

After create, update, archive, import apply, or embedding/index updates, the directory must refresh affected data.

Required refresh targets:

```txt
list
one row
filters/categories
search results
import job detail when applicable
```

Do not leave stale rows visible after a mutation succeeds.

---

## 16. Safe copy workflow

Copying `/directories/works` is allowed as a temporary accelerator.

It is not allowed to leave the copied section half-renamed or connected to works behavior.

Required workflow:

```txt
1. Copy the works slice into the new directory slice.
2. Rename files, folders, exports, route paths, messages, and cache keys.
3. Replace all works-specific fields with the new directory fields.
4. Replace all works-specific API calls and server calls.
5. Replace database table names and migrations.
6. Replace import/export column mappings.
7. Replace empty/error/loading messages.
8. Disable unfinished actions instead of pointing them to copied works behavior.
9. Run the checklist below.
10. Remove mocks before marking the section production-ready.
```

Search before review:

```txt
works
Works
directory-works
directory_works
work_id
работ
Работы
```

For a materials copy, none of those terms should remain unless the text intentionally references the works reference document.

---

## 17. Production readiness checklist

A directory is not production-ready until all items pass.

Page and UI:

- [ ] page uses the standard directory page wrapper;
- [ ] toolbar has correct search placeholder and actions;
- [ ] list shows loading state;
- [ ] list shows empty state;
- [ ] list shows error state;
- [ ] list supports pagination where needed;
- [ ] row actions are correct and directory-specific;
- [ ] add dialog works;
- [ ] edit dialog works;
- [ ] archive action works;
- [ ] unfinished actions are hidden or disabled.

Backend:

- [ ] list route is implemented;
- [ ] detail route is implemented;
- [ ] create route is implemented;
- [ ] update route is implemented;
- [ ] archive route is implemented;
- [ ] filter/category route is implemented when needed;
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
- [ ] duplicate rules are implemented where needed;
- [ ] archive is soft by default;
- [ ] import staging tables exist when import is enabled;
- [ ] export columns match the directory.

Quality:

- [ ] no mocks remain in production flow;
- [ ] no copied works route remains by accident;
- [ ] no copied works text remains by accident;
- [ ] list refreshes after create/update/archive/import;
- [ ] errors are understandable to the user;
- [ ] document for the directory is created or updated.

---

## 18. Recommended rollout order

Use this rollout order for every new directory:

```txt
1. Contract document
2. Database structure
3. Read/list route
4. UI connected to real list data
5. Create/edit/archive
6. Filters/search
7. Import/export
8. Performance and refresh behavior
9. Final cleanup and production checklist
```

For existing partially implemented directories, start by comparing them to `/directories/works` and fill the missing layers in this order.

Current recommended next target:

```txt
/directories/materials
```

Reason: the page already follows the top-level directory shape, but its data flow is still mock-based and should be upgraded to the full standard.

---

## 19. Non-goals

This standard does not require every directory to have identical fields.

This standard does not require one universal row component.

This standard does not require AI search in every directory.

This standard does not require import/export in a directory before the product needs it. If an action is not ready, it must be hidden or disabled.

This standard does require that enabled actions are real, directory-specific, and safe.
