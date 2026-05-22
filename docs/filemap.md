# File map

> This document is a compact source map for the Smetalabs repository. Keep it updated when adding new feature slices or moving files.

## Top-level folders

```txt
app/                      # Next.js routes, API routes and route groups
components/               # shared non-feature UI infrastructure
components/ui/            # approved UI primitives
features/                 # product feature modules
lib/                      # shared infrastructure and utilities
db/                       # database schema, migrations and seed data
docs/                     # source documentation
types/                    # shared domain types
```

## Feature folder convention

```txt
features/<feature>/
├── api/
├── components/
├── hooks/
├── lib/
├── server/
├── __mocks__/
├── types.ts
└── <subdomain>/components/
```

---

## `db/`

```txt
db/
├── index.ts                # Supabase service-role client wrapper for checked server code
├── seed.ts
├── seed-settings.ts
├── migrations/
│   ├── 002_rls_policies.sql
│   ├── 003_workspace_tables.sql
│   ├── 004_auth_invitation_flow.sql
│   ├── 005_rls_advisor_cleanup.sql
│   ├── 006_defer_invite_acceptance.sql
│   ├── 007_advisor_policy_grants.sql
│   ├── 008_private_rls_helpers.sql
│   ├── 009_transfer_workspace_ownership.sql
│   ├── 010_directory_works_foundation.sql
│   ├── 011_directory_works_read_api.sql
│   ├── 012_directory_works_ai_search.sql
│   ├── 013_directory_works_performance_hardening.sql
│   ├── 014_private_service_role_grants.sql
│   ├── 015_directory_work_update_rpc.sql
│   ├── 016_directory_works_large_catalog_read.sql
│   ├── 017_directory_materials_import.sql
│   ├── 018_directory_materials_ai_search.sql
│   ├── 017_fix_directory_works_search_ambiguous_id.sql
│   ├── 018_directory_works_staged_search.sql
│   ├── 019_directory_materials_foundation.sql
│   ├── 019_directory_works_manual_order.sql
│   ├── 020_large_directory_import_batches.sql
│   ├── 021_material_search_terms.sql
│   ├── 023_material_embedding_backfill.sql
│   ├── 024_directory_counterparties_foundation.sql
│   ├── 025_directory_counterparties_function_grants.sql
│   ├── 026_projects_foundation.sql
│   ├── 027_projects_function_grants.sql
│   ├── 028_projects_customer_counterparty.sql
│   ├── 029_global_purchases_foundation.sql
│   ├── 030_global_purchases_project_sort_index.sql
│   ├── 031_global_purchases_link_indexes.sql
│   ├── 032_directory_suppliers_foundation.sql
│   ├── 033_project_estimate_records_foundation.sql
│   ├── 034_project_estimate_content_foundation.sql
│   ├── 035_project_estimate_work_coefficient.sql
│   ├── 036_project_estimate_work_coefficient_bulk.sql
│   ├── 037_optimize_estimate_editor_performance.sql
│   ├── 039_optimistic_insert_delete_rpc.sql
│   ├── 040_optimistic_insert_delete_return_section.sql
│   └── 041_fix_rpc_on_conflict_do_nothing.sql
└── schema/
    ├── index.ts
    ├── projects.ts
    ├── project-estimate-records.ts
    ├── project-estimate-content.ts
    ├── global-purchases.ts
    ├── directory-counterparties.ts
    ├── directory-suppliers.ts
    ├── directory-materials.ts
    ├── directory-works.ts
    ├── profiles.ts
    ├── rbac.ts
    ├── user-settings.ts
    ├── workspace-allowed-domains.ts
    ├── workspace-invitations.ts
    └── workspace-members.ts
```

---

## Current critical flows

### Projects and project estimate records

```txt
/projects
  → app/api/projects/** exposes workspace-scoped list/read/create/update/archive routes
  → app/api/projects/[id]/estimate-records/** exposes project-scoped estimate-record list/create/update/delete routes
  → features/projects/** owns UI hooks, source-aligned form/toolbar/cards, project overview, repository and service logic
  → docs/projects-architecture.md fixes the current contract
  → docs/project-estimate-content-architecture.md fixes the estimate content storage contract (optimistic updates, RPC, targeted re-read)
  → db/schema/projects.ts and db/migrations/026-028_projects_*.sql provide project storage, helper grants and customer link
  → db/schema/project-estimate-records.ts and db/migrations/033_project_estimate_records_foundation.sql provide estimate-record storage
  → db/schema/project-estimate-content.ts and db/migrations/034_project_estimate_content_foundation.sql provide estimate section/work/material storage
  → db/migrations/035-037 optimize estimate editor performance (work coefficient, bulk recalculation, trigger cascade)
  → db/migrations/039-041 provide RPC functions for optimistic insert/delete with jsonb return and duplicate protection
```

Projects stay workspace-scoped through `workspace_owner_id`. The project list supports real list data, search, status filtering, create, update and soft archive. Customer selection is linked to active counterparties of type `customer`. Budget and progress are system-managed placeholders in this slice: they are displayed but not entered manually.

The project estimate-record layer stores rows shown in the project estimate table: name, type, status, amount and creation date. It supports list, create by name, rename and soft delete. The estimate-content storage layer extends each record with sections, works and materials. It stores copied work/material values, row order and totals.

### Estimate editor (estimate-details)

```txt
features/estimates/estimate-details/
├── components/
│   ├── estimate-editor-context.tsx        # React Context, замена prop drilling
│   ├── estimate-editor-view.tsx           # Основной view редактора
│   ├── estimate-editor-header.tsx         # Заголовок с тулбаром
│   ├── estimate-section-card.tsx          # Карточка раздела
│   ├── estimate-work-card.tsx             # Карточка работы
│   ├── estimate-material-card.tsx         # Карточка материала
│   ├── estimate-work-picker-dialog.tsx    # Пикер работ из справочника
│   ├── estimate-material-picker-dialog.tsx # Пикер материалов из справочника
│   ├── create-section-dialog.tsx          # Диалог создания раздела
│   ├── estimate-section-dialog.tsx        # Диалог раздела
│   ├── estimate-empty-state.tsx           # Пустое состояние
│   ├── estimate-empty-content.tsx         # Пустой контент
│   └── ... (вспомогательные компоненты)
├── lib/
│   ├── optimistic-update.ts              # Оптимистичные обновления кэша (12 действий)
│   └── estimate-editor-form.ts           # safeNumber, parseDecimal, parseText
├── hooks/ (использует useProjectEstimateContent из features/estimates/hooks/)
└── types.ts
```

### Global purchases first production slice

```txt
/procurements
  → app/api/global-purchases/** exposes workspace-scoped list/read/create/update/archive routes
  → app/api/global-purchases/material-options exposes lightweight material picker search
  → features/global-purchases/** owns UI hooks, material picker, toolbar, grouped list, repository and service logic
  → docs/global-purchases-architecture.md fixes the first-version contract
  → db/schema/global-purchases.ts and db/migrations/029-031_global_purchases_*.sql provide storage, ordering and link indexes
```

Global purchases stay workspace-scoped through `workspace_owner_id`. The first version opens on today's date by default, supports real list data, text search, project filtering, date filtering, grouped rows by object, material-based create, material replacement, fact quantity/price edits, row date/object edits and soft archive. Project selection is linked to active non-archived projects. Material adding uses the materials catalog as source but queries only a lightweight material-picker endpoint. Supplier selection, import, export, AI behavior, warehouse logic, payments and manual plan editing remain outside this slice.

### Directory modules (spravochniki)

```txt
features/directory-materials/       # Справочник материалов: CRUD, search, AI-search, import/export, categories
features/directory-works/           # Справочник работ: CRUD, search, AI-search, import/export, categories, ordering
features/directory-suppliers/       # Справочник поставщиков: CRUD, search, archive
features/directory-counterparties/  # Справочник контрагентов: CRUD, search, archive, bank/passport details
features/directories/               # Общие компоненты тулбаров справочников
```

All four directories are real (no mocks): each has its own DB schema in `db/schema/`, migrations, full API routes, feature slice with `api/`, `server/` (repository + service + schemas + route-handlers), `hooks/`, `components/`, and `types.ts`. Materials and works additionally support CSV import with batch processing, XLSX export, AI semantic search (embeddings via Supabase Edge Function), and large-catalog optimizations.

### Workspace settings (team management)

```txt
features/workspace-settings/        # Управление командой workspace
├── api/                            # TanStack Query клиенты и query keys
├── components/                     # 16 UI компонентов (members, invitations, domains, dialogs, cards)
├── hooks/                          # useWorkspaceMembers, useInvitations, useDomains, etc.
├── __mocks__/                      # workspace-settings (legacy mock, tests only)
└── types.ts
```

Real data via `app/api/team/**` routes + `workspace_members`, `workspace_invitations`, `workspace_allowed_domains` tables. Supports invite by email, invite link, domain allowlist, role change, suspend, remove, password reset, ownership transfer (planned).

### Account settings

```txt
features/account-settings/          # Настройки профиля и workspace
├── api/                            # TanStack Query клиенты
├── components/                     # Карточки: profile, workspace, notifications, preferences, security, sensitive-actions
├── hooks/                          # useAccountSettings, useUpdateProfile, etc.
├── server/                         # Server Actions + repository + service + schemas
├── __mocks__/
└── types.ts
```

Real data via `GET /api/settings` (merges `profiles` + `user_settings` JSONB) + server actions per subdocument. Dangerous actions (leave, transfer, deactivate) return 501 — UI shows disabled "скоро" buttons.

### Access control (RBAC)

```txt
features/access-control/            # Матрица ролей и разрешений
├── api/                            # TanStack Query клиент
├── components/                     # PermissionsMatrix, toolbar, skeleton, error
├── hooks/                          # useAccessControl, usePermissionMatrixState
├── lib/                            # buildPermissionMatrix, permissionGroups
├── __mocks__/
└── types.ts
```

Real data via `GET /api/access-control/roles` — returns roles, permissions, and role_permissions matrix. Save button disabled until persistence exists. 5 roles × 19 permissions × 5 groups.

### Dashboard

```txt
features/dashboard/                 # Дашборд: chart-area, data-table, section-cards
app/(main)/dashboard/               # Страница + data.json (mock stats)
```

Dashboard page renders section-cards with real project data. Chart components use Recharts with `--chart-1…5` tokens. Stats aggregation API routes planned.

### Auth

```txt
features/auth/                      # Формы: login, signup, forgot-password, set-password, invite-password
app/(auth)/                         # Route group: login, signup, forgot-password, set-password pages
app/auth/callback/                  # OTP/OAuth callback handler
lib/auth/                           # actions, activity, invitations, permissions, team
proxy.ts                            # Next.js 16 middleware proxy (Supabase SSR session refresh)
```

Supabase Auth with email/password. OAuth providers hidden until wired. Invitation flow: invite email → set-password → accept invitation via `lib/auth/invitations.ts`.

### Navigation shell

```txt
features/app-sidebar.tsx            # Основной sidebar приложения
features/nav-main.tsx               # Главное меню
features/nav-projects.tsx           # Список проектов в sidebar
features/nav-secondary.tsx          # Вторичное меню (настройки)
features/nav-user.tsx               # Меню пользователя
features/site-header.tsx            # Site header (public pages)
features/search-form.tsx            # Форма поиска в sidebar
components/nav-documents.tsx        # Навигация по документам сметы
```

### Purchases and Execution tabs (estimate sub-pages)

```txt
features/purchases/                 # Закупки внутри сметы (estimate sub-tab)
features/execution/                 # Выполнение внутри сметы (estimate sub-tab)
app/(main)/projects/[projectId]/estimates/[estimateId]/
├── purchases/page.tsx              # Вкладка «Закупки»
├── execution/page.tsx              # Вкладка «Выполнение»
├── finances/page.tsx               # Вкладка «Финансы»
├── documents/page.tsx              # Вкладка «Документы»
└── layout.tsx                      # Sub-layout с estimate-navigation-tabs
```

Purchases and execution use estimate-scoped tables (`purchases`, `executions`). Currently use `__mocks__/` — migration to real data planned in phase 4. Finances and documents are placeholder pages.

### Estimate editor — component inventory

```txt
features/estimates/estimate-details/components/
├── estimate-editor-context.tsx        # React Context
├── estimate-editor-view.tsx           # Основной view
├── estimate-editor-header.tsx         # Заголовок с тулбаром
├── estimate-section-card.tsx          # Карточка раздела
├── estimate-section.tsx               # Компактный раздел
├── estimate-section-dialog.tsx        # Диалог раздела
├── create-section-dialog.tsx          # Создание раздела
├── estimate-work-card.tsx             # Карточка работы
├── estimate-work-picker-dialog.tsx    # Пикер работ из справочника
├── estimate-work-actions.tsx          # Действия над работой
├── estimate-work-number.tsx           # Номер работы
├── estimate-material-card.tsx         # Карточка материала
├── estimate-material-picker-dialog.tsx # Пикер материалов из справочника
├── estimate-material-actions.tsx      # Действия над материалом
├── estimate-material-name.tsx         # Наименование материала
├── estimate-row.tsx                   # Строка (work/material)
├── estimate-metric-group.tsx          # Группа метрик
├── estimate-name.tsx                  # Наименование позиции
├── estimate-value.tsx                 # Значение (ед. изм, цена, сумма)
├── estimate-summary-value.tsx         # Итоговое значение
├── estimate-empty-state.tsx           # Пустое состояние
├── estimate-empty-content.tsx         # Пустой контент секции
├── estimate-debug-material-card.tsx   # Debug-карточка материала
└── estimate-tabs/
    ├── estimate-tab-placeholder.tsx   # Плейсхолдер таба
    └── estimate-tab-toolbar.tsx       # Тулбар таба
