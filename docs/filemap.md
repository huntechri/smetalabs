# SmetaLabs — Filemap

> Last updated: 2026-05-17
>
> Canonical compact project map. For layer ownership and architectural rules, see [`docs/architecture.md`](./architecture.md). For `/settings/account` behavior, see [`docs/account-settings.md`](./account-settings.md). For the production works catalog contract and hardening notes, see [`docs/directory-works-architecture.md`](./directory-works-architecture.md). For `/directories/materials`, see [`docs/directory-materials-architecture.md`](./directory-materials-architecture.md). For `/directories/suppliers`, see [`docs/directory-suppliers-architecture.md`](./directory-suppliers-architecture.md).

---

## Top-level structure

```txt
smetalabs/
├── app/                    # Next.js App Router routes, layouts, API routes, server actions
├── components/             # shared app components and shadcn/ui primitives
├── db/                     # Drizzle client, schema, migrations, seed scripts
├── docs/                   # architecture, filemap, account-settings, directory contracts and design-system documentation
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
    ├── directory-suppliers/ # workspace-scoped suppliers catalog read/search/CRUD endpoints
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
│   ├── server/             # repository/service/import/export/AI route logic
│   └── types.ts            # feature-local materials catalog types
├── directory-suppliers/
│   ├── api/                # client API, errors, query keys/cache tags
│   ├── components/         # suppliers directory view shell
│   ├── directory-suppliers-details/components/ # list rows and form dialog
│   ├── hooks/              # TanStack Query hooks and mutations
│   ├── lib/                # pure events/helpers
│   ├── server/             # repository/service/route logic
│   └── types.ts            # feature-local suppliers catalog types
├── directory-works/
│   ├── api/                # client API, errors, mappers, query keys/cache tags
│   ├── components/         # works directory view shell
│   ├── directory-works-details/components/ # list rows, form dialog, import dialog
│   ├── hooks/              # TanStack Query hooks and mutations
│   ├── lib/                # pure events/helpers
│   ├── server/             # repository/service/search/import/export/embeddings/observability
│   └── types.ts            # feature-local works catalog types
├── directory-counterparties/
├── access-control/
├── account-settings/
└── workspace-settings/
```

Feature folder convention:

```txt
features/<feature>/
├── api/                    # feature-local clients/query keys for API routes or action wrappers
├── components/             # feature UI
├── hooks/                  # feature-local client state/data hooks (TanStack Query for server state)
├── lib/                    # pure feature helpers/builders
├── server/                 # server-only feature actions/repositories/services when app/actions delegates
├── __mocks__/              # temporary/mock data only while backend integration is explicitly incomplete
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
│   ├── 018_directory_materials_ai_search.sql
│   └── 019_directory_suppliers_foundation.sql
├── scripts/
│   └── seed-directory-works-load-test.sql
└── schema/
    ├── index.ts
    ├── directory-materials.ts
    ├── directory-suppliers.ts
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

### Directory suppliers first production slice

```txt
/directories/suppliers
  → app/api/directory-suppliers/** exposes workspace-scoped read/search/CRUD routes
  → features/directory-suppliers/** owns UI hooks, dialogs, repository/service logic
  → docs/directory-suppliers-architecture.md fixes the first-version contract and exclusions
  → db/schema/directory-suppliers.ts and db/migrations/019_directory_suppliers_foundation.sql provide storage
```

The suppliers catalog must stay workspace-scoped through `workspace_owner_id = workspace_members.owner_id`. Import, export, AI search, complex filters and material linking are intentionally outside the first version.

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
| Deployment helper script               | `scripts/*.mjs`                                       |
