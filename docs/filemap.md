# SmetaLabs — Filemap

> Last updated: 2026-05-19
>
> Canonical compact project map. For layer ownership and architectural rules, see [`docs/architecture.md`](./architecture.md). For `/projects`, see [`docs/projects-architecture.md`](./projects-architecture.md). For `/procurements`, see [`docs/global-purchases-architecture.md`](./global-purchases-architecture.md). For `/settings/account` behavior, see [`docs/account-settings.md`](./account-settings.md). For the production works catalog contract and hardening notes, see [`docs/directory-works-architecture.md`](./directory-works-architecture.md). For `/directories/materials`, see [`docs/directory-materials-architecture.md`](./directory-materials-architecture.md). For `/directories/counterparties`, see [`docs/directory-counterparties-architecture.md`](./directory-counterparties-architecture.md). For `/directories/suppliers`, see [`docs/directory-suppliers-architecture.md`](./directory-suppliers-architecture.md).

---

## Top-level structure

```txt
smetalabs/
├── app/                    # Next.js App Router routes, layouts, API routes, server actions
├── components/             # shared app components and shadcn/ui primitives
├── db/                     # Drizzle client, schema, migrations, seed scripts
├── docs/                   # architecture, filemap, feature contracts and design-system documentation
├── features/               # feature-owned UI, hooks and screens
├── hooks/                  # global hooks only
├── lib/                    # shared infra, auth helpers, Supabase clients, utilities
├── public/                 # static assets
├── scripts/                # automation/deployment helper scripts
├── types/                  # shared cross-feature TypeScript types
├── proxy.ts                # Next middleware entry; delegates to lib/supabase/proxy.ts
├── drizzle.config.ts       # Drizzle Kit config
├── components.json         # shadcn/ui config
├── eslint.config.mjs       # ESLint config
├── next.config.mjs         # Next.js config
├── vercel.json             # Vercel deployment and ignored-build configuration
├── package.json            # scripts and dependencies
└── README.md
```

---

## `app/`

```txt
app/
├── layout.tsx
├── globals.css
├── page.tsx
├── (auth)/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   └── set-password/page.tsx
├── (main)/
│   ├── dashboard/page.tsx
│   ├── projects/**
│   ├── directories/
│   │   ├── counterparties/page.tsx
│   │   ├── materials/page.tsx
│   │   ├── suppliers/page.tsx
│   │   └── works/page.tsx
│   ├── procurements/page.tsx
│   ├── team/page.tsx
│   ├── templates/**
│   └── settings/
│       ├── account/page.tsx
│       └── access/page.tsx
├── admin/page.tsx
├── auth/callback/route.ts
├── actions/
│   ├── access-control.ts
│   ├── settings.ts
│   ├── team.ts
│   └── workspace-settings.ts
└── api/
    ├── access-control/roles/route.ts
    ├── projects/                 # workspace-scoped projects list/read/create/update/archive endpoints
    ├── global-purchases/         # workspace-scoped procurements list/read/create/update/archive/material-picker endpoints
    ├── directory-counterparties/  # workspace-scoped counterparties catalog read/search/CRUD endpoints
    ├── directory-suppliers/       # workspace-scoped suppliers catalog read/search/CRUD endpoints
    ├── directory-materials/       # workspace-scoped materials catalog read/search/CRUD/import/export/AI endpoints
    ├── directory-works/           # workspace-scoped works catalog read/search/CRUD/import/export/AI endpoints
    ├── settings/route.ts
    └── team/**
```

---

## `features/`

```txt
features/
├── app-sidebar.tsx
├── site-header.tsx
├── search-form.tsx
├── nav-main.tsx
├── nav-projects.tsx
├── nav-secondary.tsx
├── nav-user.tsx
├── auth/
├── dashboard/
├── projects/
│   ├── api/                # client API, errors, query keys/cache tags
│   ├── components/         # projects screen, source-aligned toolbar, cards and form dialog
│   ├── hooks/              # TanStack Query hook and mutations
│   └── server/             # repository/service/route logic
├── estimates/
├── purchases/
├── execution/
├── global-purchases/
│   ├── api/                # client API, errors, query keys/cache tags
│   ├── global-purchases-details/components/ # procurements screen, toolbar, grouped list, rows and material picker
│   ├── hooks/              # TanStack Query hook and mutations
│   ├── lib/                # UI events + CSV import parser
│   ├── server/             # repository/service/route/material-options/export logic
├── directories/
├── directory-counterparties/
│   ├── api/                # client API, errors, query keys/cache tags
│   ├── components/         # counterparties directory view shell
│   ├── directory-counterparties-details/components/ # list rows and form dialog
│   ├── hooks/              # TanStack Query hook and mutations
│   ├── lib/                # pure events/helpers
│   ├── server/             # repository/service/route logic
│   └── types.ts            # feature-local counterparties catalog types
├── directory-suppliers/
│   ├── api/                # client API, errors, query keys/cache tags
│   ├── components/         # suppliers directory view shell
│   ├── directory-suppliers-details/components/ # list rows and form dialog
│   ├── hooks/              # TanStack Query hook and mutations
│   ├── lib/                # UI events
│   ├── server/             # repository/service/route logic
│   └── types.ts            # feature-local suppliers catalog types
├── directory-materials/
│   ├── api/
│   ├── components/
│   ├── directory-materials-details/components/
│   ├── hooks/
│   ├── lib/
│   │   └── directory-materials-events.ts
│   ├── server/
│   │   ├── directory-materials.repository.ts
│   │   ├── directory-materials.service.ts
│   │   ├── directory-materials.schemas.ts
│   │   ├── directory-materials.route-handlers.ts
│   │   ├── directory-materials-import.repository.ts
│   │   ├── directory-materials-fast-import.repository.ts
│   │   ├── directory-materials-large-import.repository.ts
│   │   ├── directory-materials.export.ts
│   │   └── directory-materials-ai.ts
│   └── types.ts
├── directory-works/
│   ├── api/
│   ├── components/
│   ├── directory-works-details/components/
│   ├── hooks/
│   ├── lib/
│   │   └── directory-works-events.ts
│   ├── server/
│   │   ├── directory-works.repository.ts
│   │   ├── directory-works.service.ts
│   │   ├── directory-works.schemas.ts
│   │   ├── directory-works.route-handlers.ts
│   │   ├── directory-works-import.repository.ts
│   │   ├── directory-works-large-import.repository.ts
│   │   ├── directory-works.export.ts
│   │   ├── directory-works.search.ts
│   │   ├── directory-works.embeddings.ts
│   │   ├── directory-works.observability.ts
│   │   └── directory-works.ordering.ts
│   └── types.ts
├── access-control/
├── account-settings/
└── workspace-settings/
```

Feature folder convention:

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
│   └── 032_directory_suppliers_foundation.sql
└── schema/
    ├── index.ts
    ├── projects.ts
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

### Projects first production slice

```txt
/projects
  → app/api/projects/** exposes workspace-scoped list/read/create/update/archive routes
  → features/projects/** owns UI hooks, source-aligned form/toolbar/cards, repository and service logic
  → docs/projects-architecture.md fixes the first-version contract
  → db/schema/projects.ts and db/migrations/026-028_projects_*.sql provide storage, helper grants and customer link
```

Projects stay workspace-scoped through `workspace_owner_id`. The first version supports real list data, search, status filtering, create, update and soft archive. Customer selection is linked to active counterparties of type `customer`. Budget and progress are system-managed placeholders in this slice: they are displayed but not entered manually. Project estimates, participants, files, payments, detailed project page, automatic budget/progress calculation, import/export and AI behavior remain outside this slice.

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

### Directory suppliers first production slice

```txt
/directories/suppliers
  → app/api/directory-suppliers/** exposes workspace-scoped read/search/CRUD routes
  → features/directory-suppliers/** owns UI hooks, form dialog, repository and service logic
  → docs/directory-suppliers-architecture.md fixes the first-version contract
  → db/schema/directory-suppliers.ts and db/migrations/032_directory_suppliers_foundation.sql provide storage
```

The suppliers catalog stays workspace-scoped through `workspace_owner_id`. Import, export, AI search, complex filters, mass actions and material linking are intentionally outside the first version.

### Directory counterparties production slice

```txt
/directories/counterparties
  → app/api/directory-counterparties/** exposes workspace-scoped read/search/CRUD routes
  → features/directory-counterparties/** owns UI hooks, form dialog, repository and service logic
  → docs/directory-counterparties-architecture.md fixes the first-version contract
  → db/schema/directory-counterparties.ts and db/migrations/024-025 directory_counterparties migrations provide storage and save grants
```

The counterparties catalog stays workspace-scoped through `workspace_owner_id`. Import, export, AI search and complex filters are intentionally outside the first version.

### Directory materials production slice

```txt
/directories/materials
  → app/api/directory-materials/** exposes workspace-scoped read/search/CRUD/import/export/AI routes
  → features/directory-materials/** owns UI hooks, dialogs, repository/service/import/export/AI logic
  → docs/directory-materials-architecture.md fixes the production contract and rollout state
  → db/schema/directory-materials.ts and db/migrations/017-018 directory_materials migrations provide import and AI storage/search additions
```

The materials catalog must stay workspace-scoped through `workspace_owner_id = workspace_members.owner_id`; import is staged and must not write raw uploaded rows directly into `directory_materials`. Export uses the current list filters/search, resets browser pagination and collects rows in bounded batches before writing the file. AI provider calls are server-only and scoped by the current workspace.

### Directory works backend contract and implementation

```txt
/directories/works
  → app/api/directory-works/** exposes workspace-scoped read/search/CRUD/import/export/AI routes
```

Directory works stay workspace-scoped and must follow the dedicated contract in `docs/directory-works-architecture.md`.