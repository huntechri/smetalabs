# SmetaLabs — Architecture Guide

> Last updated: 2026-05-12
>
> Scope: production-facing architecture rules for the current Next.js 16 + Supabase Auth + Drizzle + shadcn/ui codebase.

This document is the architectural contract for where code belongs and how new features should be added. For the compact directory map, see [`docs/filemap-current.md`](./filemap-current.md). For visual/design rules, see [`docs/design-system.md`](./design-system.md).

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

### Auth callback route

`app/auth/callback/route.ts` handles Supabase callback patterns such as `token_hash` and `code`. It should not hard-code dashboard redirects when a `next` value is present.

Do not use this route for generic page rendering. It is a request boundary.

---

## 4. Auth and invite flow

The expected invite flow is:

```txt
Admin sends invite
  ↓
Supabase creates invite email
  ↓
User opens invite link
  ↓
Supabase verifies one-time token and creates an invite session
  ↓
App lands on /set-password
  ↓
User sets password through supabase.auth.updateUser({ password })
  ↓
App redirects to /dashboard
```

Important rules:

- Invite redirect target must be `/set-password`, not `/dashboard`.
- `/set-password` must be allowed by `lib/supabase/proxy.ts`; otherwise the app may redirect to `/login` before the browser client finishes processing the invite session.
- Supabase Redirect URLs must include the exact production and local callback targets used by the app.
- Old invite links are one-time links. Do not debug current behavior with already-opened links.

Recommended Supabase Redirect URLs:

```txt
https://smetalabs.vercel.app/set-password
https://smetalabs.vercel.app/auth/callback
http://localhost:3000/set-password
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
- `docs/filemap-current.md`
- `docs/design-system.md`
- `README.md`

A route or folder change without docs is considered incomplete.
