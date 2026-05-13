# SmetaLabs — Architecture Guide

> Last updated: 2026-05-13
>
> Scope: production-facing architecture rules for the current Next.js 16 + Supabase Auth + Drizzle + shadcn/ui codebase.

This document is the architectural contract for where code belongs and how new features should be added. For the compact directory map, see [`docs/filemap.md`](./filemap.md). For visual/design rules, see [`docs/design-system.md`](./design-system.md).

---

## 1. Core stack

| Area | Current choice |
|---|---|
| Framework | Next.js 16, App Router |
| UI | shadcn/ui primitives in `components/ui/` |
| Styling | Tailwind CSS v4, semantic CSS variables in `app/globals.css` |
| Language | TypeScript |
| Auth | Supabase Auth with `@supabase/ssr` |
| Database | PostgreSQL through Drizzle ORM |
| RBAC | `roles`, `permissions`, `role_permissions`, workspace membership/invitations |
| Package manager | pnpm |

The project is no longer frontend-only. Auth, RBAC, workspace/team management, settings APIs, Drizzle schema and migrations are already present.

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
- direct database logic inside UI pages.

### `features/` — feature UI and client orchestration

`features/<feature>/` owns domain-specific UI, hooks and screens.

Use this layer for:

- forms, tables, cards and screens specific to one product feature;
- feature hooks such as filtering/search/view state;
- feature-local `api/` clients and query-key factories for API routes/server action wrappers;
- TanStack Query hooks for server state (`useQuery`/`useMutation`), with invalidation owned by the feature hook;
- feature-local `server/` modules when `app/actions/*` delegates domain actions into the feature boundary;
- fallback mocks while backend integration is incomplete.

Do not put shadcn primitives here. Import primitives from `@/components/ui/*`.

### `components/ui/` — design-system primitives only

This folder is reserved for shadcn/ui primitives and project-approved primitive extensions.

Rules:

- no business logic;
- no imports from `app/**`;
- no feature-specific labels, API calls or domain state;
- prefer composition in `features/**` over creating wrappers here.

### `components/` — cross-app non-feature components

Use this only for app-wide building blocks such as providers, theme infrastructure or truly generic shared components.

### `lib/` — shared server/client infrastructure

Current important areas:

- `lib/supabase/client.ts` — browser Supabase client;
- `lib/supabase/server.ts` — server Supabase client;
- `lib/supabase/proxy.ts` — session refresh and route protection logic;
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

Use `types/` for cross-feature TypeScript types that are consumed from more than one feature.

If a type is private to one feature, keep it inside that feature.

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

`/set-password` is used after an invited user accepts a Supabase invite. The page sets the password through the browser Supabase client using `supabase.auth.updateUser({ password })` after the invite session exists.

### Main app routes

`app/(main)/**` renders the authenticated SaaS shell.

Current areas:

- `/dashboard`
- `/projects`
- `/projects/[projectId]`
- `/projects/[projectId]/estimates/[estimateId]`
- `/directories/*`
- `/procurements`
- `/team`
- `/templates`
- `/settings/account`
- `/settings/access`

`/team` owns team management only: workspace/team summary, members, manual email invites, pending invitations and role reference/management. It must not render catch-all workspace settings controls such as invite links, allowed-domain auto-join policy, workspace ownership transfer or danger-zone actions until those controls have a dedicated workspace/security settings route and production-safe backend contract.

### Auth callback route

`app/auth/callback/route.ts` handles Supabase callback patterns such as `token_hash` and `code`. It should not hard-code dashboard redirects when a `next` value is present.

Do not use this route for generic page rendering. It is a request boundary.

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
- the route is consumed by multiple components.

Use `app/actions/**` when:

- the mutation is tied to a server action form or page-level server workflow;
- the action should revalidate paths directly;
- it does not need a public JSON endpoint.

Both patterns must validate input with schemas or explicit checks.

---

## 6. Data flow patterns

### Read flow

```txt
Page/layout
  → feature component
  → feature hook or API route
  → lib/auth or db layer
  → Supabase/Postgres
```

### Mutation flow

```txt
Client form/action
  → server action or app/api route
  → permission check
  → DB/Auth mutation
  → revalidate/return JSON
  → UI refresh
```

### Permission flow

Every workspace/team mutation must check the current user first. Do not trust client-provided role or owner fields.

Common helpers live in `lib/auth/**`.

### Staged RBAC and permission matrix strategy

The current stage is role-based workspace access, not fully editable permission-based authorization.

Until the core business modules are stable, runtime access control must stay coarse-grained and predictable:

- `owner` and `admin` manage workspace/team operations;
- `manager` can read workspace/team data where explicitly allowed;
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

## 7. UI architecture rules

- Use `components/ui/**` primitives directly.
- Put feature-specific UI in `features/<feature>/components/**`.
- Put feature-specific hooks in `features/<feature>/hooks/**`.
- Do not duplicate generic table/dialog/form primitives unless the pattern is proven reusable across features.
- Avoid global wrappers unless they are app-wide infrastructure.
- Keep visual decisions aligned with `docs/design-system.md`.

---

## 8. Adding a new feature

For a new feature named `reports`:

```txt
app/(main)/reports/page.tsx
features/reports/components/reports-view.tsx
features/reports/hooks/use-reports.ts
features/reports/types.ts      # only if private to the feature
app/api/reports/route.ts       # only if client fetch is required
types/report.ts                # only if shared across features
```

Do not put `reports-view.tsx` in `components/ui/`. It is not a primitive.

---

## 9. Documentation maintenance rule

When a PR changes routing, auth flow, folder ownership or public feature structure, update at least one of:

- `docs/architecture.md`
- `docs/filemap.md`
- `docs/design-system.md`
- `README.md`

A route or folder change without docs is considered incomplete.

## 10. Validation and checks

Current package scripts define `pnpm typecheck`, `pnpm lint`, and `pnpm build` as the primary repository-level checks. There is no configured `test` script yet; PR descriptions must not report `npm test` or an automated unit test suite as executed until such a script exists in `package.json`.
