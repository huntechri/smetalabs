# SmetaLabs — Filemap

> Last updated: 2026-05-16
>
> Canonical compact project map. For layer ownership and architectural rules, see [`docs/architecture.md`](./architecture.md). For `/settings/account` behavior, see [`docs/account-settings.md`](./account-settings.md). For the production works catalog contract and hardening notes, see [`docs/directory-works-architecture.md`](./directory-works-architecture.md). For `/directories/materials`, see [`docs/directory-materials-architecture.md`](./directory-materials-architecture.md). For cross-module search architecture, see [`docs/search-architecture.md`](./search-architecture.md). For directory module conventions, see [`docs/directory-module-standard.md`](./directory-module-standard.md).

---

## Top-level structure

```txt
smetalabs/
├── app/                    # Next.js App Router routes, layouts, API routes, server actions
├── components/             # shared app components and shadcn/ui primitives
├── db/                     # Drizzle client, schema, migrations, seed scripts
├── docs/                   # architecture, filemap, account-settings, directory contracts, design-system, search and module standards
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
├── layout.tsx              # root layout, fonts/providers/global shell
├── globals.css             # Tailwind v4, shadcn tokens, CSS variables
├── page.tsx                # root/developer navigation page
├── favicon.ico
│
├── (auth)/                 # auth screens without main app sidebar
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   └── set-password/page.tsx
│
├── (main)/                 # authenticated app shell
│   ├── layout.tsx          # SidebarProvider + AppSidebar + SiteHeader
│   ├── page.tsx            # redirects/entry to dashboard
│   ├── dashboard/page.tsx
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [projectId]/
│   │       ├── page.tsx
│   │       └── estimates/[estimateId]/
│   │           ├── layout.tsx
│   │           ├── page.tsx
│   │           ├── documents/page.tsx
│   │           ├── execution/page.tsx
│   │           ├── finances/page.tsx
│   │           └── purchases/page.tsx
│   ├── directories/
│   │   ├── counterparties/page.tsx
│   │   ├── materials/page.tsx
│   │   ├── suppliers/page.tsx
│   │   └── works/page.tsx
│   ├── procurements/page.tsx
│   ├── team/page.tsx
│   ├── templates/
│   │   ├── page.tsx
│   │   └── [templateId]/page.tsx
│   └── settings/
│       ├── account/page.tsx
│       └── access/page.tsx
│
├── admin/page.tsx
│
├── auth/
│   └── callback/route.ts   # Supabase email/OAuth callback handler
│
├── actions/
│   ├── access-control.ts
│   ├── settings.ts         # delegates account settings mutations/security/dangerous actions to features/account-settings/server
│   ├── team.ts
│   └── workspace-settings.ts
│
└── api/
    ├── access-control/roles/route.ts
    ├── directory-materials/ # workspace-scoped materials catalog read/search/CRUD/import/export/AI endpoints
    ├── directory-works/     # workspace-scoped works catalog read/search/CRUD/import/export/AI endpoints
    ├── settings/route.ts    # account settings read boundary
    └── team/
        ├── overview/route.ts
        ├── invitations/
        │   ├── route.ts
        │   ├── accept/route.ts
        │   └── [id]/
        │       ├── route.ts
        │       └── resend/route.ts
        ├── domains/
        │   ├── route.ts
        │   └── [id]/route.ts
        ├── invite-link/route.ts
        └── members/
            ├── route.ts
            └── [userId]/
                ├── route.ts
                └── reset-password/route.ts
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
│
├── auth/
├── dashboard/
├── projects/
├── estimates/
├── purchases/
├── execution/
├── global-purchases/
├── directories/
├── directory-materials/
│   ├── api/                # client API, errors, query keys/cache tags
│   ├── components/         # materials directory view shell
│   ├── directory-materials-details/components/ # list rows, form dialog, import dialog
│   ├── hooks/              # TanStack Query hooks and mutations
│   ├── lib/                # pure events/helpers
│   ├── server/             # repository/service/import/export/AI/embeddings
│   └── types.ts            # feature-local materials catalog types
├── directory-works/
│   ├── api/                # client API, errors, mappers, query keys/cache tags
│   ├── components/         # works directory view shell
│   ├── directory-works-details/components/ # list rows, form dialog, import dialog
│   ├── hooks/              # TanStack Query hooks and mutations
│   ├── lib/                # pure events/helpers
│   ├── server/             # repository/service/search/import/export/embeddings/observability
│   └── types.ts            # feature-local works catalog types
├── directory-suppliers/
├── directory-counterparties/
├── access-control/
├── account-settings/
└── workspace-settings/
    ├── api/                # team client, errors, mappers, query keys
    ├── components/         # team management, workspace settings views
    │   └── members/        # member table, row, actions, dialogs, mobile list
    ├── hooks/              # TanStack Query hooks for members, domains, invitations
    ├── __mocks__/          # workspace settings mock data
    └── types.ts            # feature-local workspace settings types
```

Feature folder convention:

```txt
features/<feature>/
├── api/                    # feature-local clients/query keys for API routes or action wrappers
├── components/             # feature UI
├── hooks/                  # feature-local client state/data hooks (TanStack Query for server state)
├── lib/                    # pure feature helpers/builders
├── server/                 # server-only feature actions/repositories/services when app/actions delegates
├── __mocks__/              # temporary/mock data when needed
├── types.ts                # private feature types when needed
└── <subdomain>/components/ # optional deeper decomposition for large features
```

---

## `db/`

```txt
db/
├── index.ts                # Drizzle client / Supabase service-role client wrapper
├── seed.ts                 # RBAC seed
├── seed-settings.ts        # user settings seed
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
│   ├── 017_fix_directory_works_search_ambiguous_id.sql
│   ├── 018_directory_materials_ai_search.sql
│   ├── 018_directory_works_staged_search.sql
│   ├── 019_directory_materials_foundation.sql
│   ├── 019_directory_works_manual_order.sql
│   ├── 020_large_directory_import_batches.sql
│   └── 021_material_search_terms.sql
├── scripts/
│   └── seed-directory-works-load-test.sql
└── schema/
    ├── index.ts
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

### Directory materials production slice

```txt
/directories/materials
  → app/api/directory-materials/** exposes workspace-scoped read/search/CRUD/import/export/AI routes
  → features/directory-materials/** owns UI hooks, dialogs, repository/service/import/export/AI logic
  → docs/directory-materials-architecture.md fixes the production contract and rollout state
  → db/schema/directory-materials.ts and db/migrations/017-021 directory_materials migrations provide foundation, import, AI storage/search and batch infrastructure
```

The materials catalog must stay workspace-scoped through `workspace_owner_id = workspace_members.owner_id`; import is staged and must not write raw uploaded rows directly into `directory_materials`. AI provider calls are server-only and scoped by the current workspace.

### Directory works backend contract and implementation

```txt
/directories/works
  → app/api/directory-works/** exposes workspace-scoped read/search/CRUD/import/export/AI routes
  → features/directory-works/** owns UI hooks, dialogs, repository/service/search/import/export/embeddings
  → docs/directory-works-architecture.md fixes the production contract and hardening strategy
  → db/schema/directory-works.ts and db/migrations/010-019 provide DB foundation, read RPCs, AI search, staged search, manual ordering and performance hardening
```

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

### Materials catalog (#105–#119, 2026-05-12 — 2026-05-16)
- `docs/directory-materials-architecture.md` — production materials catalog contract, rollout state, AI processing/search, staged import and CSV export.
- `docs/directory-module-standard.md` — standardised directory module conventions (applies to works, materials and future directories).
- `db/migrations/017_directory_materials_import.sql` — staged import jobs and rows.
- `db/migrations/018_directory_materials_ai_search.sql` — material-only AI search function over prepared embeddings.
- `db/migrations/019_directory_materials_foundation.sql` — materials table, categories, RLS and CRUD RPCs.
- `db/migrations/020_large_directory_import_batches.sql` — batch-processing infrastructure for large CSV imports (>10k rows).
- `db/migrations/021_material_search_terms.sql` — material-specific full-text and term-based search infrastructure.
- `features/directory-materials/server/directory-materials.repository.ts` — materials CRUD repository.
- `features/directory-materials/server/directory-materials.service.ts` — materials business logic layer.
- `features/directory-materials/server/directory-materials-import.repository.ts` — materials CSV preview/apply flow with row validation, duplicate detection and conflict marking.
- `features/directory-materials/server/directory-materials-large-import.repository.ts` — batch-based large import processing.
- `features/directory-materials/server/directory-materials-fast-import.repository.ts` — accelerated import path for pre-validated data.
- `features/directory-materials/server/directory-materials-ai.ts` — materials AI data queue, provider-side processing and hybrid AI search.
- `features/directory-materials/server/directory-materials.export.ts` — materials CSV export logic.
- `features/directory-materials/directory-materials-details/components/directory-material-import-dialog.tsx` — materials import dialog and CSV preview UI.
- `app/api/directory-materials/import-jobs/[id]/apply-fast/route.ts` — fast-apply endpoint for pre-validated imports.

### Works catalog (#103 + earlier, 2026-05-12 — 2026-05-16)
- `docs/directory-works-architecture.md` — canonical implemented architecture for #64/#65-#71, including DB foundation, search, CRUD, import/export, AI search, cache/indexing and observability.
- `docs/directory-works-performance-hardening.md` — focused #71 notes for cache/indexing/performance diagnostics.
- `docs/directory-works-search-system.md` — works search architecture: staged, materialised, and AI-powered paths.
- `docs/search-architecture.md` — cross-module search architecture overview.
- `db/migrations/017_fix_directory_works_search_ambiguous_id.sql` — disambiguate id column in search functions.
- `db/migrations/018_directory_works_staged_search.sql` — staged/materialised search path for works.
- `db/migrations/019_directory_works_manual_order.sql` — manual ordering support for works catalog.

### Deployment
- `scripts/vercel-ignore-build.mjs` and `vercel.json` — guarded Vercel build/deployment behavior for primary vs non-primary branches.
