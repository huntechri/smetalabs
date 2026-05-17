# SmetaLabs — Filemap

> Last updated: 2026-05-17
>
> Canonical compact project map. For layer ownership and architectural rules, see [`docs/architecture.md`](./architecture.md). For `/settings/account` behavior, see [`docs/account-settings.md`](./account-settings.md). For the production works catalog contract and hardening notes, see [`docs/directory-works-architecture.md`](./directory-works-architecture.md). For `/directories/materials`, see [`docs/directory-materials-architecture.md`](./directory-materials-architecture.md). For `/directories/counterparties`, see [`docs/directory-counterparties-architecture.md`](./directory-counterparties-architecture.md).

---

## Top-level structure

```txt
smetalabs/
├── app/                    # Next.js App Router routes, layouts, API routes, server actions
├── components/             # shared app components and shadcn/ui primitives
├── db/                     # Supabase client, schema, migrations, seed scripts, load-test seeds
├── docs/                   # architecture, filemap, design-system, contracts, audits, prompts
├── features/               # feature-owned UI, hooks, server logic, API clients, types
├── hooks/                  # global hooks only
├── lib/                    # shared infra, auth helpers, Supabase clients, utilities
├── public/                 # static assets
├── scripts/                # automation/deployment helper scripts
├── supabase/               # Supabase Edge Functions, config
├── types/                  # shared cross-feature TypeScript types
├── proxy.ts                # Next middleware entry; delegates to lib/supabase/proxy.ts
├── drizzle.config.ts       # Drizzle Kit config
├── components.json         # shadcn/ui config
├── eslint.config.mjs       # ESLint config
├── next-env.d.ts           # Next.js TypeScript declarations (auto-generated)
├── next.config.mjs         # Next.js config
├── vercel.json             # Vercel deployment and ignored-build configuration
├── vitest.config.ts        # Vitest configuration
├── vitest.setup.ts         # Vitest setup (jest-dom matchers)
├── package.json            # scripts and dependencies
└── README.md
```

---

## `app/`

```txt
app/
├── layout.tsx
├── page.tsx
├── globals.css
├── (auth)/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   └── set-password/page.tsx
├── (main)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── data.json
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [projectId]/**
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
    ├── directory-counterparties/
    │   ├── route.ts
    │   └── [id]/route.ts
    ├── directory-materials/
    │   ├── route.ts
    │   ├── ai-search/route.ts
    │   ├── categories/route.ts
    │   ├── embeddings/process/route.ts
    │   ├── export/route.ts
    │   ├── search/route.ts
    │   ├── [id]/route.ts
    │   └── import-jobs/**
    ├── directory-works/
    │   ├── route.ts
    │   ├── ai-search/route.ts
    │   ├── categories/route.ts
    │   ├── embeddings/process/route.ts
    │   ├── export/route.ts
    │   ├── search/route.ts
    │   ├── [id]/route.ts
    │   └── import-jobs/**
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
│   └── components/
│       ├── auth-illustration.tsx
│       ├── forgot-password-form.tsx
│       ├── invite-password-form.tsx
│       ├── login-form.tsx
│       ├── set-password-form.tsx
│       └── signup-form.tsx
├── account-settings/
│   ├── api/
│   ├── components/           # 7 card components + settings view shell
│   ├── hooks/
│   ├── server/               # server actions, schemas, repository, service
│   ├── __mocks__/
│   └── types.ts
├── access-control/
│   ├── api/                  # client, query keys
│   ├── components/           # permissions matrix table, toolbar, error, skeleton
│   ├── hooks/                # use-access-control, permission matrix state, update
│   ├── lib/                  # build matrix, permission groups
│   ├── __mocks__/
│   └── types.ts
├── workspace-settings/
│   ├── api/                  # team client, mappers, errors, query keys
│   ├── components/
│   │   ├── members/          # 12 components: row, table, dialogs, actions, status, error, skeleton, mobile list, section
│   │   ├── allowed-domains-card.tsx
│   │   ├── invite-link-card.tsx
│   │   ├── invite-member-card.tsx
│   │   ├── pending-invitations-table.tsx
│   │   ├── remove-member-dialog.tsx
│   │   ├── reset-password-dialog.tsx
│   │   ├── role-change-dialog.tsx
│   │   ├── suspend-member-dialog.tsx
│   │   ├── team-management-view.tsx
│   │   ├── workspace-actions-card.tsx
│   │   ├── workspace-members-table.tsx
│   │   ├── workspace-overview-card.tsx
│   │   ├── workspace-roles-summary-card.tsx
│   │   └── workspace-settings-view.tsx
│   ├── hooks/                # 7 hooks: members, overview, settings, domains, invitations, invite-link, invite-member
│   ├── __mocks__/
│   └── types.ts
├── dashboard/
├── projects/
│   ├── components/
│   ├── hooks/
│   └── __mocks__/
├── estimates/
│   ├── components/
│   ├── estimate-details/components/
│   ├── estimate-tabs/components/
│   ├── hooks/
│   └── __mocks__/
├── purchases/
│   ├── components/
│   ├── purchase-details/components/
│   ├── hooks/
│   └── __mocks__/
├── execution/
│   ├── components/
│   ├── execution-details/components/
│   ├── hooks/
│   └── __mocks__/
├── global-purchases/
│   ├── global-purchases-details/components/
│   ├── hooks/
│   └── __mocks__/
├── directories/
│   ├── components/           # shared directory toolbars (5 files: counterparties, materials, suppliers, works + unified)
│   └── lib/                  # shared csv-import-batches utility
├── directory-counterparties/
│   ├── api/                  # client API, errors, query keys
│   ├── components/           # counterparties directory view shell
│   ├── directory-counterparties-details/components/ # list rows, form dialog, metric/name/value/section
│   ├── hooks/                # TanStack Query hook and mutations
│   ├── lib/                  # pure events/helpers
│   ├── server/               # repository, service, route handlers, schemas
│   └── types.ts
├── directory-materials/
│   ├── api/
│   ├── components/
│   ├── directory-materials-details/components/  # row, section, form dialog, import dialog
│   ├── hooks/
│   ├── lib/
│   ├── server/               # repository, service, import/export/AI/search/route handlers/schemas/large-import
│   └── types.ts
├── directory-works/
│   ├── api/                  # client, mappers, errors, query keys, tests
│   ├── components/           # view shell, category filter
│   ├── directory-works-details/components/ # row, section, form/import dialogs, code/metric/name/value
│   ├── hooks/
│   ├── lib/
│   ├── server/               # repository, service, import/export/AI/search/embedding/ordering/large-import/observability/schemas/route handlers, tests
│   ├── __mocks__/
│   └── types.ts
└── directory-suppliers/
    ├── components/
    ├── directory-suppliers-details/components/
    ├── hooks/
    └── __mocks__/
```

Feature folder convention:

```txt
features/<feature>/
├── api/              # TanStack Query hooks, client, mappers, errors, query keys
├── components/       # feature-level view shell
├── <subdomain>/components/  # sub-feature components (details, dialogs)
├── hooks/            # feature-only or domain-scoped hooks
├── lib/              # feature-level utilities, pure functions
├── server/           # repository, service, route handlers, schemas, AI, ordering, embedding
├── __mocks__/        # mock data for development/preview
└── types.ts          # feature-local TypeScript types
```

---

## `components/`

```txt
components/
├── nav-documents.tsx
├── query-provider.tsx
├── theme-provider.tsx
└── ui/
    ├── aspect-ratio.tsx
    ├── avatar.tsx
    ├── badge.tsx
    ├── breadcrumb.tsx
    ├── button.tsx
    ├── button-group.tsx
    ├── calendar.tsx
    ├── card.tsx
    ├── chart.tsx
    ├── checkbox.tsx
    ├── collapsible.tsx
    ├── dialog.tsx
    ├── drawer.tsx
    ├── dropdown-menu.tsx
    ├── editable-badge.tsx
    ├── empty.tsx
    ├── field.tsx
    ├── frame.tsx
    ├── framed-button.tsx
    ├── input.tsx
    ├── label.tsx
    ├── popover.tsx
    ├── select.tsx
    ├── separator.tsx
    ├── sheet.tsx
    ├── sidebar.tsx
    ├── skeleton.tsx
    ├── sonner.tsx
    ├── spinner.tsx
    ├── switch.tsx
    ├── table.tsx
    ├── tabs.tsx
    ├── textarea.tsx
    ├── toggle.tsx
    ├── toggle-group.tsx
    └── tooltip.tsx
```

---

## `hooks/`

```txt
hooks/
└── use-mobile.ts           # global mobile detection hook (Sidebar context)
```

---

## `lib/`

```txt
lib/
├── auth/
│   ├── actions.ts
│   ├── activity.ts
│   ├── invitations.ts
│   ├── permissions.ts
│   └── team.ts
├── supabase/
│   ├── client.ts
│   ├── proxy.ts
│   └── server.ts
├── calculations.ts
├── formatters.ts
└── utils.ts
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
│   ├── 017_fix_directory_works_search_ambiguous_id.sql
│   ├── 018_directory_materials_ai_search.sql
│   ├── 018_directory_works_staged_search.sql
│   ├── 019_directory_materials_foundation.sql
│   ├── 019_directory_works_manual_order.sql
│   ├── 020_large_directory_import_batches.sql
│   ├── 021_material_search_terms.sql
│   ├── 023_material_embedding_backfill.sql
│   ├── 024_directory_counterparties_foundation.sql
│   └── 025_directory_counterparties_function_grants.sql
├── scripts/
│   └── seed-directory-works-load-test.sql
└── schema/
    ├── index.ts
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

## `supabase/`

```txt
supabase/
└── functions/
    └── material-embeddings-worker/
        └── index.ts        # Edge Function: async material embeddings generation via OpenAI
```

---

## `docs/`

```txt
docs/
├── account-settings.md
├── architecture.md
├── backend-architecture.md
├── deployment-notes.md
├── design-system.md
├── designer-prompt.md
├── directory-counterparties-architecture.md
├── directory-materials-architecture.md
├── directory-materials-ui.md
├── directory-module-standard.md
├── directory-works-architecture.md
├── directory-works-performance-hardening.md
├── directory-works-search-system.md
├── filemap.md
├── material-embeddings-supabase-worker.md
├── search-architecture.md
└── ui-audit.md
```

---

## Current critical flows

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
  → db/schema/directory-materials.ts and db/migrations/017-021,023 directory_materials migrations provide import, AI storage/search additions and embedding backfill
  → features/directory-materials/server/directory-materials-large-import.repository.ts handles large CSV import batching
```

The materials catalog must stay workspace-scoped through `workspace_owner_id = workspace_members.owner_id`; import is staged and must not write raw uploaded rows directly into `directory_materials`. Export uses the current list filters/search, resets browser pagination and collects rows in bounded batches before writing the file. AI provider calls are server-only and scoped by the current workspace.

### Directory works backend contract and implementation

```txt
/directories/works
  → app/api/directory-works/** exposes workspace-scoped read/search/CRUD/import/export/AI routes
  → features/directory-works/** owns UI hooks, dialogs, repository/service/search/import/export/embeddings/ordering
  → docs/directory-works-architecture.md fixes the production contract and hardening strategy
  → db/migrations/010-020 directory_works migrations provide DB foundation, read RPCs, AI search, staged search, manual ordering and performance hardening
  → features/directory-works/server/directory-works-large-import.repository.ts handles large CSV import batching
  → features/directory-works/server/directory-works.observability.ts provides performance diagnostics
```

Works export uses the active screen filters/search for category and subcategory scoped downloads, resets browser pagination and remains bounded by the export cap.

### Shared directory toolbars

```txt
features/directories/components/
  → directories-toolbar.tsx — unified toolbar pattern for directory views
  → counterparties-toolbar.tsx, materials-toolbar.tsx, suppliers-toolbar.tsx, works-toolbar.tsx — per-directory implementations
  → features/directories/lib/csv-import-batches.ts — shared CSV import batch processing utility
```

### Material embeddings worker (Supabase Edge Function)

```txt
supabase/functions/material-embeddings-worker/index.ts
  → Async background worker triggered via pg_net for generating material embeddings
  → Called from features/directory-materials/server/directory-materials-ai.ts
  → Documented in docs/material-embeddings-supabase-worker.md
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
| Global hook                            | `hooks/*.ts`                                           |
| DB schema                              | `db/schema/*.ts`                                       |
| SQL migration                          | `db/migrations/*.sql`                                  |
| DB load-test seed                      | `db/scripts/*.sql`                                     |
| Supabase Edge Function                 | `supabase/functions/<name>/index.ts`                   |
| Deployment helper script               | `scripts/*.mjs`                                        |
| Vercel deployment config               | `vercel.json`                                          |
| shadcn primitive                       | `components/ui/*.tsx`                                  |
| Business UI                            | `features/<feature>/components/*.tsx`                  |
| Shared directory utility               | `features/directories/lib/*.ts`                        |
| Shared directory toolbar               | `features/directories/components/*.tsx`                |

---

## Recent directory/deployment updates

- `supabase/functions/material-embeddings-worker/index.ts` — Edge Function for async material embeddings generation via OpenAI.
- `docs/material-embeddings-supabase-worker.md` — worker architecture and invocation contract.
- `features/directory-materials/server/directory-materials-large-import.repository.ts` — large CSV import batching for materials.
- `features/directory-works/server/directory-works-large-import.repository.ts` — large CSV import batching for works.
- `features/directory-works/server/directory-works.observability.ts` — directory works performance observability/diagnostics.
- `features/directory-works/server/directory-works.ordering.ts` — manual ordering support for works.
- `db/migrations/017_fix_directory_works_search_ambiguous_id.sql` — fix ambiguous id in works search functions.
- `db/migrations/018_directory_works_staged_search.sql` — staged search for works catalog.
- `db/migrations/019_directory_works_manual_order.sql` — manual ordering support for works.
- `db/migrations/020_large_directory_import_batches.sql` — batch-oriented import infrastructure.
- `db/scripts/seed-directory-works-load-test.sql` — load-test seed script for works directory.
- `features/directories/components/` — shared directory toolbars (5 files) factoring out per-directory toolbar patterns.
- `features/directories/lib/csv-import-batches.ts` — shared CSV import batch utility.
- `features/workspace-settings/components/members/` — expanded to 12 components: member row, table, actions menu, dialogs, status badge, error/skeleton states, mobile list, section wrapper.
- `features/workspace-settings/hooks/` — expanded to 7 hooks: members, overview, settings, domains, invitations, invite-link, invite-member.
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
