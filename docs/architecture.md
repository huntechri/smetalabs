# SmetaLabs — Architecture Guide

> Last updated: 2026-05-14
>
> Scope: production-facing architecture rules for the current Next.js 16 + Supabase Auth/Postgres + Drizzle + TanStack Query + shadcn/ui codebase.

This document is the architectural contract for where code belongs and how new features should be added. For the compact directory map, see [`docs/filemap.md`](./filemap.md). For visual/design rules, see [`docs/design-system.md`](./design-system.md). For `/settings/account` behavior, see [`docs/account-settings.md`](./account-settings.md). For the production works catalog, see [`docs/directory-works-architecture.md`](./directory-works-architecture.md).

---

## 1. Core stack

| Area | Current choice |
|---|---|
| Framework | Next.js 16.1, App Router |
| Runtime UI | React 19 |
| UI primitives | shadcn/ui primitives in `components/ui/` |
| Styling | Tailwind CSS v4, semantic CSS variables in `app/globals.css` |
| Language | TypeScript 5.9 |
| Auth | Supabase Auth with `@supabase/ssr` |
| Database | Supabase PostgreSQL through Drizzle ORM |
| Server state | TanStack Query v5, feature-owned query-key factories |
| Validation | Zod at API/server-action boundaries |
| RBAC | `roles`, `permissions`, `role_permissions`, workspace membership/invitations |
| Search | PostgreSQL full-text/trigram search; pgvector for directory works AI search |
| Tests | Vitest scripts are present in `package.json` |
| Package manager | pnpm |
| Deployment | Vercel with guarded preview-build configuration |

The project is not frontend-only. Auth, RBAC, workspace/team management, account settings, Drizzle schema, SQL migrations, route handlers, server actions, directory works backend/search/import/export/AI search and performance hardening are already present.

---

## 2. Layer model

### `app/` — routing, shells, route handlers, server actions

`app/` owns URL structure and request boundaries. Keep it thin.

Allowed here:

- route pages and layouts;
- route handlers under `app/api/**`;
- server actions under `app/actions/**`;
- composition of feature-level screens.

Avoid here:

- large reusable UI blocks;
- business-specific widgets that can live in `features/**`;
- direct database logic inside UI pages;
- workspace/permission decisions based on client-provided owner or role fields.

### `features/` — feature UI, client orchestration and domain boundaries

`features/<feature>/` owns domain-specific UI, hooks, API adapters, query keys and feature-local server modules.

Use this layer for:

- forms, tables, cards and screens specific to one product feature;
- feature hooks such as filtering/search/view state;
- feature-local `api/` clients and query-key factories for API routes/server action wrappers;
- TanStack Query hooks for server state (`useQuery`/`useMutation`), with invalidation owned by the feature hook;
- feature-local `server/` modules when `app/actions/*` or `app/api/**` delegates domain logic into the feature boundary;
- fallback mocks only while backend integration is explicitly incomplete.

Do not put shadcn primitives here. Import primitives from `@/components/ui/*`.

### `components/ui/` — design-system primitives only

This folder is reserved for shadcn/ui primitives and project-approved primitive extensions.

Rules:

- no business logic;
- no imports from `app/**`;
- no feature-specific labels, API calls or domain state;
- prefer composition in `features/**` over creating wrappers here.

### `components/` — cross-app non-feature infrastructure

Use this only for app-wide building blocks such as providers, theme infrastructure or truly generic shared components.

Current examples:

- `components/query-provider.tsx` — TanStack Query app provider;
- `components/theme-provider.tsx` — app theme infrastructure.

### `lib/` — shared server/client infrastructure

Current important areas:

- `lib/supabase/client.ts` — browser Supabase client;
- `lib/supabase/server.ts` — server Supabase client;
- `lib/supabase/proxy.ts` — session refresh, route protection and workspace activity touch logic;
- `lib/auth/**` — auth/RBAC/workspace helpers;
- `lib/utils.ts` — low-level utility helpers.

Do not place feature UI in `lib/`.

### `db/` — database schema, migrations and seed data

`db/` owns Drizzle schema and database initialization.

Rules:

- schema definitions stay in `db/schema/**`;
- SQL migrations stay in `db/migrations/**`;
- seed scripts stay in `db/seed*.ts`;
- UI must not import directly from migrations or seed scripts.

### `types/` — shared domain types

Use `types/` for cross-feature TypeScript types that are consumed from more than one feature. If a type is private to one feature, keep it inside that feature.

---

## 3. Routing contract

Current high-level route groups:

```txt
app/
├── (auth)/        # public auth pages: login, signup, forgot-password, set-password
├── (main)/        # protected app shell with sidebar/header
├── admin/         # admin area
├── auth/          # callback endpoints for Supabase email/OAuth flows
├── actions/       # server actions
└── api/           # REST-style route handlers
```

### Auth routes

`app/(auth)/**` renders public auth screens without the main sidebar.

Current pages:

- `/login`
- `/signup`
- `/forgot-password`
- `/set-password`

`/set-password` is used after invited-user and reset-password flows. The page updates the password through the browser Supabase client after a valid Auth session exists.

### Main app routes

`app/(main)/**` renders the authenticated SaaS shell.

Current areas:

- `/dashboard`
- `/projects`
- `/projects/[projectId]`
- `/projects/[projectId]/estimates/[estimateId]`
- `/directories/*`
- `/directories/works`
- `/procurements`
- `/team`
- `/templates`
- `/settings/account`
- `/settings/access`

`/settings/account` owns authenticated account profile, workspace display/editing rules, account-level notification preferences, security actions and any explicitly disabled future account controls. Its current behavior contract is documented in [`docs/account-settings.md`](./account-settings.md). User-visible controls on this route must not imply functionality that is not wired to backend/runtime behavior.

`/team` owns team management only: workspace/team summary, members, manual email invites, pending invitations and role reference/management. It must not render catch-all workspace settings controls such as invite links, allowed-domain auto-join policy, workspace ownership transfer or danger-zone actions until those controls have a dedicated workspace/security settings route and production-safe backend contract.

`/directories/works` owns the production works catalog UI. It must use the `features/directory-works/**` boundary and the workspace-scoped `app/api/directory-works/**` route handlers for reads, search, manual CRUD, import/export and AI search.

### Auth callback route

`app/auth/callback/route.ts` handles Supabase callback patterns such as `token_hash` and `code`. It should not hard-code dashboard redirects when a validated `next` value is present.

Do not use this route for generic page rendering. It is a request boundary.

### Directory works API routes

Current directory works routes are workspace-scoped and server-authoritative:

```txt
GET    /api/directory-works
POST   /api/directory-works
GET    /api/directory-works/search
GET    /api/directory-works/categories
GET    /api/directory-works/:id
PATCH  /api/directory-works/:id
DELETE /api/directory-works/:id
POST   /api/directory-works/import-jobs
GET    /api/directory-works/import-jobs/:id
POST   /api/directory-works/import-jobs/:id/apply
GET    /api/directory-works/export
POST   /api/directory-works/ai-search
POST   /api/directory-works/embeddings/process
```

These routes must resolve the current workspace server-side. Clients must never pass `workspace_owner_id` as an authority source.

---

## 4. Auth and invite flow

The expected invite flow is:

```txt
Admin sends invite
  ↓
App calls Supabase admin invite with redirectTo = current origin + /auth/callback
  ↓
Supabase invite email template builds /auth/callback?token_hash=...&type=invite&next=/set-password
  ↓
User opens invite link
  ↓
app/auth/callback verifies token_hash and creates an invite session
  ↓
App lands on /set-password
  ↓
User sets password through supabase.auth.updateUser({ password })
  ↓
App accepts the pending workspace invitation
  ↓
App redirects to /dashboard
```

Important rules:

- App code must pass `redirectTo` as the current request origin plus `/auth/callback`; do not pass `/set-password` directly from invite endpoints.
- The Supabase invite email template must append `token_hash`, `type=invite` and `next=/set-password` to `{{ .RedirectTo }}`.
- `/set-password` must be allowed by `lib/supabase/proxy.ts`; otherwise the app may redirect to `/login` before the browser client finishes processing the invite session.
- Supabase Redirect URLs must include the exact production, preview and local callback targets used by the app.
- Old invite links are one-time links. Do not debug current behavior with already-opened links.
- Repeated invite tests on the same email may reuse an existing Auth user whose metadata points to an older invitation. `acceptInvitationIfPresent()` must therefore prefer metadata when valid, but fall back to the latest pending invitation for the authenticated email.

Required Supabase invite email template shape:

```html
<h2>Вы приглашены в SmetaLab</h2>

<p>Вас пригласили присоединиться к рабочей области SmetaLab.</p>

<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite&next=/set-password">
    Принять приглашение
  </a>
</p>

<p>Если вы не ожидали это письмо, просто проигнорируйте его.</p>
```

Recommended Supabase Redirect URLs:

```txt
https://smetalabs.vercel.app/auth/callback
https://smetalabs.vercel.app/**
https://smetalabs-git-*-smetalabs.vercel.app/auth/callback
https://smetalabs-git-*-smetalabs.vercel.app/**
http://localhost:3000/auth/callback
http://localhost:3000/**
```

---

## 5. API and server action rules

Use `app/api/**/route.ts` when:

- the client needs JSON via fetch;
- there is a REST-style collection/member endpoint;
- the route is consumed by multiple components;
- the route is a read/search/export/import/processor boundary.

Use `app/actions/**` when:

- the mutation is tied to a server action form or page-level server workflow;
- the action should revalidate paths directly;
- it does not need a public JSON endpoint.

Both patterns must validate input with schemas or explicit checks.

Account settings use both patterns deliberately: `app/api/settings/route.ts` is the read boundary, while `app/actions/settings.ts` delegates mutations/security actions into `features/account-settings/server/**`. Keep this split unless there is a clear reason to move a specific operation.

Directory works uses API routes for read/search/CRUD/import/export/AI search because the feature is table/search-heavy and client state is coordinated through TanStack Query hooks.

---

## 6. Data flow patterns

### Read flow

```txt
Page/layout
  → feature component
  → feature hook or API route
  → feature server/service/repository boundary when needed
  → lib/auth or db layer
  → Supabase/Postgres
```

### Mutation flow

```txt
Client form/action
  → server action or app/api route
  → schema validation
  → permission check
  → DB/Auth mutation
  → targeted revalidation/invalidation
  → UI refresh
```

### Permission flow

Every workspace/team/directory mutation must check the current user first. Do not trust client-provided role, owner or workspace fields.

Common helpers live in `lib/auth/**`.

### Account settings behavior discipline

Account settings controls must be one of three states:

- real: wired to backend/runtime behavior and safe to use;
- read-only: displays authoritative data without pretending it can mutate it;
- future: disabled with explicit copy and no successful mutation path.

Do not show fake counters, stale JSONB-derived security values, or enabled save buttons for controls that do not change runtime behavior.

### Staged RBAC and permission matrix strategy

The current stage is role-based workspace access, not fully editable permission-based authorization.

Until the core business modules are stable, runtime access control must stay coarse-grained and predictable:

- `owner` and `admin` manage workspace/team operations;
- `manager` can read workspace/team data where explicitly allowed and can write directory works where the feature contract allows it;
- `estimator` and `viewer` receive restricted access;
- tenant boundaries are resolved through workspace membership, not client-provided workspace IDs.

The `roles`, `permissions` and `role_permissions` tables are the target permission matrix model. At the current stage they may be used for display, seed data and future architecture alignment, but they must not be exposed as a user-editable source of truth until all sensitive runtime paths enforce permission keys consistently.

Do not enable a "Save permissions" UI while changes in `role_permissions` are not enforced by all relevant server actions, API routes and database policies. A writable matrix without full runtime enforcement creates false-success and weakens the security model.

When new features are added, define future permission keys while implementing the feature, using this shape:

```txt
<resource>.<action>
```

Examples:

```txt
projects.read
projects.create
projects.update
projects.delete
estimates.read
estimates.create
estimates.update
estimates.delete
team.read
team.manage
directoryWorks.read
directoryWorks.manage
billing.read
billing.manage
```

The target permission-based stage may be implemented after the main feature modules stabilize. That stage requires:

- a single `hasWorkspacePermission` / `requireWorkspacePermission` helper;
- permission checks in every sensitive server action and API route;
- transactional updates for `role_permissions`;
- RLS policies or Postgres security-definer helpers aligned with backend authorization;
- smoke tests for admin, manager, estimator and viewer behavior.

Some safety invariants must remain outside the editable matrix and cannot be disabled by configuration:

- the workspace owner always retains control;
- the last owner/admin cannot be removed or downgraded;
- `SUPABASE_SERVICE_ROLE_KEY` is server-only;
- tenant isolation is always enforced through workspace membership;
- billing and security-critical operations require explicit backend checks even if a permission row is misconfigured.

---

## 7. Directory works production boundary

The works catalog is no longer only a UI/mock or documentation contract. Epic #64 phases #65-#71 are represented in the codebase:

```txt
#65 contract/documentation
#66 DB foundation
#67 read API and regular search
#68 UI backend integration and manual CRUD
#69 import/export staging flow
#70 embeddings and AI/hybrid search
#71 cache/indexing/performance hardening
```

Current ownership:

```txt
/directories/works
  → app/(main)/directories/works/page.tsx
  → features/directory-works/components/directory-works-view.tsx
  → features/directory-works/hooks/**
  → features/directory-works/api/**
  → app/api/directory-works/**
  → features/directory-works/server/**
  → db/schema/directory-works.ts + db/migrations/010-013
```

Rules:

- tenant boundary is `workspace_owner_id = workspace_members.owner_id`;
- API routes resolve the workspace server-side through auth helpers;
- reads exclude `deleted_at` and default to active works unless explicitly scoped otherwise;
- manual delete is a soft archive, not physical deletion;
- import uses staging jobs/rows before canonical writes;
- embedding generation is asynchronous through a process endpoint and never runs inside CRUD/import transactions;
- server cache tags and TanStack Query keys must stay aligned with `docs/directory-works-architecture.md`;
- mutation/import/embedding paths must invalidate targeted list/detail/category/AI-search keys, not globally refetch the app.

---

## 8. UI architecture rules

- Use `components/ui/**` primitives directly.
- Put feature-specific UI in `features/<feature>/components/**`.
- Put feature-specific hooks in `features/<feature>/hooks/**`.
- Put feature-specific server-state clients/query keys in `features/<feature>/api/**`.
- Do not duplicate generic table/dialog/form primitives unless the pattern is proven reusable across features.
- Avoid global wrappers unless they are app-wide infrastructure.
- Keep visual decisions aligned with `docs/design-system.md`.

---

## 9. Deployment and preview-build guard

Vercel deployment is configured through `vercel.json` and `scripts/vercel-ignore-build.mjs`.

Current rule:

- primary branches `master` and `main` are allowed to build;
- non-primary branches are ignored by the ignore command;
- `feature/*`, `feature-*`, `codex-*`, `agent-*` and `internal-*` are disabled through Vercel git deployment settings.

Do not rely on every pushed branch producing a preview deployment. When a task requires preview QA, confirm the branch naming/deployment rules before assuming a Vercel URL will exist.

---

## 10. Adding a new feature

For a new feature named `reports`:

```txt
app/(main)/reports/page.tsx
features/reports/components/reports-view.tsx
features/reports/hooks/use-reports.ts
features/reports/api/reports-client.ts       # if client fetch/query state is required
features/reports/api/reports-query-keys.ts   # if TanStack Query is used
features/reports/server/reports.service.ts   # if domain server logic is needed
features/reports/types.ts                    # only if private to the feature
app/api/reports/route.ts                     # only if JSON/API boundary is required
types/report.ts                             # only if shared across features
```

Do not put `reports-view.tsx` in `components/ui/`. It is not a primitive.

---

## 11. Documentation maintenance rule

When a PR changes routing, auth flow, folder ownership, public feature structure, database schema, migrations, cache strategy, deployment behavior, or user-visible account/settings behavior, update at least one of:

- `docs/architecture.md`
- `docs/backend-architecture.md`
- `docs/filemap.md`
- `docs/design-system.md`
- `docs/account-settings.md`
- `docs/directory-works-architecture.md`
- `README.md`

A route, folder, account-settings behavior, public feature, DB schema, cache contract or deployment behavior change without docs is considered incomplete.

Do not create duplicate documentation files for the same concern. Update the canonical existing document.

---

## 12. Validation and checks

Current package scripts define these repository-level checks:

```txt
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm test:watch
pnpm test:coverage
```

PR descriptions must distinguish between checks actually run and checks still required. Historical lint debt or unavailable local dependency installs must be stated explicitly rather than reported as passing.
