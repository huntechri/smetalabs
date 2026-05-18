# SmetaLabs — Filemap

> Last updated: 2026-05-18
>
> Canonical compact project map. For layer ownership and architectural rules, see [`docs/architecture.md`](./architecture.md). For `/projects`, see [`docs/projects-architecture.md`](./projects-architecture.md). For `/settings/account` behavior, see [`docs/account-settings.md`](./account-settings.md). For the production works catalog contract and hardening notes, see [`docs/directory-works-architecture.md`](./directory-works-architecture.md). For `/directories/materials`, see [`docs/directory-materials-architecture.md`](./directory-materials-architecture.md). For `/directories/counterparties`, see [`docs/directory-counterparties-architecture.md`](./directory-counterparties-architecture.md).

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
    ├── directory-counterparties/  # workspace-scoped counterparties catalog read/search/CRUD endpoints
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
├── directories/
├── directory-counterparties/
│   ├── api/                # client API, errors, query keys/cache tags
│   ├── components/         # counterparties directory view shell
│   ├── directory-counterparties-details/components/ # list rows and form dialog
│   ├── hooks/              # TanStack Query hook and mutations
│   ├── lib/                # pure events/helpers
│   ├── server/             # repository/service/route logic
│   └── types.ts            # feature-local counterparties catalog types
├── directory-materials/
│   ├── api/
│   ├── components/
│   ├── directory-materials-details/components/
│   ├── hooks/
│   ├── lib/
│   ├── server/
│   └── types.ts
├── directory-works/
│   ├── api/
│   ├── components/
│   ├── directory-works-details/components/
│   ├── hooks/
│   ├── lib/
│   ├── server/
│   └── types.ts
├── directory-suppliers/
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
│   ├── 019_directory_materials_foundation.sql
│   ├── 021_material_search_terms.sql
│   ├── 023_material_embedding_backfill.sql
│   ├── 024_directory_counterparties_foundation.sql
│   ├── 025_directory_counterparties_function_grants.sql
│   ├── 026_projects_foundation.sql
│   ├── 027_projects_function_grants.sql
│   └── 028_projects_customer_counterparty.sql
└── schema/
    ├── index.ts
    ├── projects.ts
    ├── directory-counterparties.ts
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
  → features/directory-works/** owns UI hooks, dialogs, repository/service/search/import/export/embeddings
  → docs/directory-works-architecture.md fixes the production contract and hardening strategy
  → db/schema/directory-works.ts and db/migrations/010-016 provide DB foundation, read RPCs, AI search and performance hardening
```

Works export uses the active screen filters/search for category and subcategory scoped downloads, resets browser pagination and remains bounded by the export cap.

---

## Quick placement guide

| Task                                   | Put it here                                            |
| -------------------------------------- | ------------------------------------------------------ |
| New route/page                         | `app/(main)/.../page.tsx` or `app/(auth)/.../page.tsx` |
| New feature screen                     | `features/<feature>/components/*-view.tsx`             |
| Feature-only hook                      | `features/<feature>/hooks/use-*.ts`                    |
| Cross-feature type                     | `types/*.ts`                                           |
| Feature-private type                   | `features/<feature>/types.ts`                          |
| API endpoint                           | `app/api/<domain>/route.ts`                            |
| Server action                          | `app/actions/<domain>.ts`                              |
| Auth/RBAC helper                       | `lib/auth/*.ts`                                        |
| Supabase client/session infrastructure | `lib/supabase/*.ts`                                    |
| DB schema                              | `db/schema/*.ts`                                       |
| SQL migration                          | `db/migrations/*.sql`                                  |
| Deployment helper script               | `scripts/*.mjs`                                        |
| Vercel deployment config               | `vercel.json`                                          |
| shadcn primitive                       | `components/ui/*.tsx`                                  |
| Business UI                            | `features/<feature>/components/*.tsx`                  |

---

## Recent directory/deployment updates

- `docs/projects-architecture.md` — first-version contract for `/projects`, including customer selection and system-managed budget/progress.
- `db/migrations/026_projects_foundation.sql` — workspace-scoped projects storage with soft archive and search fields.
- `db/migrations/027_projects_function_grants.sql` — grants for project helper functions used during save.
- `db/migrations/028_projects_customer_counterparty.sql` — optional link from projects to customer counterparties.
- `features/projects/**` and `app/api/projects/**` — projects list, create, update, archive, search and status filter flow.
- `docs/directory-counterparties-architecture.md` — first-version contract for the counterparties catalog, including save helper grants.
- `db/migrations/024_directory_counterparties_foundation.sql` — workspace-scoped counterparties storage with soft archive and search fields.
- `db/migrations/025_directory_counterparties_function_grants.sql` — grants for search helper functions used during counterparty save.
- `features/directory-counterparties/**` and `app/api/directory-counterparties/**` — counterparties list, create, update, archive and regular search flow.
- `features/directory-works/directory-works-details/components/directory-works-section.tsx` — works export now keeps the current screen filters/search, including category and subcategory, while dropping pagination.
- `features/directory-materials/server/directory-materials.service.ts` — materials export now collects matching rows in bounded batches instead of exporting only the first page.
- `docs/directory-module-standard.md` — shared export rule now explicitly covers full directory, selected category and selected subcategory behavior.
- `docs/directory-materials-architecture.md` — production materials catalog contract, current rollout state and AI processing/search foundation.
- `db/migrations/018_directory_materials_ai_search.sql` — material-only AI search function over prepared embeddings.
- `features/directory-materials/server/directory-materials-ai.ts` — materials AI data queue, provider-side processing and hybrid AI search logic.
- `app/api/directory-materials/embeddings/process/route.ts` — material-only AI data processing endpoint.
- `app/api/directory-materials/ai-search/route.ts` — material-only AI search endpoint.
- `db/migrations/017_directory_materials_import.sql` — staged import jobs and rows for materials.
- `features/directory-materials/server/directory-materials-import.repository.ts` — materials CSV preview/apply flow with row validation, duplicate detection and conflict marking.
- `features/directory-materials/directory-materials-details/components/directory-material-import-dialog.tsx` — materials import dialog and CSV preview UI.
- `docs/directory-works-architecture.md` — canonical implemented architecture for #64/#65-#71, including DB foundation, search, CRUD, import/export, AI search, cache/indexing and observability.
- `docs/directory-works-performance-hardening.md` — focused #71 notes for cache/indexing/performance diagnostics.
- `scripts/vercel-ignore-build.mjs` and `vercel.json` — guarded Vercel build/deployment behavior for primary vs non-primary branches.
