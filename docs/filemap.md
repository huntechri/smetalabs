# SmetaLabs — Filemap

> Last updated: 2026-05-13
>
> Canonical compact project map. For layer ownership and architectural rules, see [`docs/architecture.md`](./architecture.md). For `/settings/account` behavior, see [`docs/account-settings.md`](./account-settings.md). For the production works catalog contract, see [`docs/directory-works-architecture.md`](./directory-works-architecture.md).

---

## Top-level structure

```txt
smetalabs/
├── app/                    # Next.js App Router routes, layouts, API routes, server actions
├── components/             # shared app components and shadcn/ui primitives
├── db/                     # Drizzle client, schema, migrations, seed scripts
├── docs/                   # architecture, filemap, account-settings, directory-works and design-system documentation
├── features/               # feature-owned UI, hooks and screens
├── hooks/                  # global hooks only
├── lib/                    # shared infra, auth helpers, Supabase clients, utilities
├── public/                 # static assets
├── types/                  # shared cross-feature TypeScript types
├── proxy.ts                # Next middleware entry; delegates to lib/supabase/proxy.ts
├── drizzle.config.ts       # Drizzle Kit config
├── components.json         # shadcn/ui config
├── eslint.config.mjs       # ESLint config
├── next.config.mjs         # Next.js config
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
    ├── settings/route.ts   # account settings read boundary
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

### App ownership rules

- `app/(auth)/**` owns auth pages only.
- `app/(main)/**` owns protected product routes only.
- `app/api/**` owns JSON route handlers.
- `app/actions/**` owns server actions and compatibility wrappers.
- Route files should delegate UI to `features/**` whenever the screen grows beyond simple composition.

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
│   └── components/
│       ├── auth-illustration.tsx
│       ├── login-form.tsx
│       ├── signup-form.tsx
│       ├── forgot-password-form.tsx
│       └── set-password-form.tsx
│
├── dashboard/
├── projects/
├── estimates/
├── purchases/
├── execution/
├── global-purchases/
├── directories/
├── directory-materials/
├── directory-works/
├── directory-suppliers/
├── directory-counterparties/
├── access-control/
├── account-settings/
│   ├── api/                # settings client/action adapters and query keys
│   ├── components/         # profile/workspace/preferences/notifications/security/sensitive cards
│   ├── hooks/              # TanStack Query hooks and settings mutations
│   ├── server/             # schemas, repository/service, profile/workspace/preferences/notifications/password/dangerous actions
│   └── types.ts            # feature-local account settings types
└── workspace-settings/
    ├── api/                # team client, mappers, errors and query keys
    ├── components/         # team/workspace settings UI sections
    └── hooks/              # workspace/team query and mutation hooks
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

Rules:

- feature UI imports primitives from `@/components/ui/*`;
- feature UI may call API routes or server actions through approved boundaries;
- server-state hooks should use `@tanstack/react-query` via `components/query-provider.tsx` and feature query-key factories;
- feature folders should not mutate global app shell unless they are shell-specific files like `app-sidebar.tsx`.

---

## `components/`

```txt
components/
├── ui/                     # shadcn/ui primitives and approved primitive extensions
├── query-provider.tsx      # TanStack Query app provider
├── theme-provider.tsx
└── nav-documents.tsx       # legacy/template navigation component
```

`components/ui/` is not a feature folder. Do not put business-specific cards, tables, dialogs or screens there.

---

## `lib/`

```txt
lib/
├── supabase/
│   ├── client.ts           # browser client
│   ├── server.ts           # server client
│   └── proxy.ts            # session refresh, route protection and workspace activity touch
├── auth/
│   ├── activity.ts         # throttled workspace_members.last_active_at touch helper
│   ├── actions.ts
│   ├── invitations.ts
│   ├── permissions.ts
│   └── team.ts
└── utils.ts                # generic utilities
```

Rules:

- `lib/supabase/proxy.ts` is the source of truth for middleware route protection.
- Auth helper logic belongs in `lib/auth/**`.
- `lib/auth/activity.ts` is a lightweight activity signal for workspace members, not an audit log or online-presence system.
- `lib/auth/team.ts` must not resolve a synthetic active workspace for users that only have invited/suspended memberships.
- Do not put React screens/components in `lib/`.

---

## `docs/`

```txt
docs/
├── architecture.md                  # layer/routing/auth/API/UI rules
├── account-settings.md              # /settings/account behavior contract and feature status
├── backend-architecture.md          # backend/database/API target model
├── directory-works-architecture.md  # production works catalog contract for #64/#65
├── design-system.md                 # visual system, tokens and component usage
└── filemap.md                       # this compact map
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
│   └── 010_directory_works_foundation.sql
└── schema/
    ├── index.ts
    ├── directory-works.ts
    ├── profiles.ts
    ├── rbac.ts
    ├── user-settings.ts
    ├── workspace-allowed-domains.ts
    ├── workspace-invitations.ts
    └── workspace-members.ts
```

Rules:

- Drizzle schema changes go to `db/schema/**`.
- SQL migrations go to `db/migrations/**`.
- Seed data goes to `db/seed*.ts`.

---

## `types/`

```txt
types/
├── purchase.ts
├── execution.ts
├── global-purchases.ts
├── estimate.ts
├── directory-material.ts
├── directory-work.ts
├── directory-supplier.ts
├── directory-counterparty.ts
├── project.ts
└── roles.ts
```

Use `types/` only for shared cross-feature types. Keep feature-private types in `features/<feature>/types.ts`.

---

## Current critical flows

### Login

```txt
/login
  → features/auth/components/login-form.tsx
  → app/lib auth action/client flow
  → Supabase Auth
  → /dashboard
```

### Invite + password setup

```txt
/team invite action or /api/team/invitations
  → supabase.auth.admin.inviteUserByEmail(... redirectTo: /auth/callback)
  → user opens email link
  → /auth/callback verifies token_hash/code and creates session
  → /set-password
  → features/auth/components/invite-password-form.tsx
  → supabase.auth.updateUser({ password })
  → /api/team/invitations/accept
  → /dashboard
```

### Account settings

```txt
/settings/account
  → features/account-settings/components/account-settings-view.tsx
  → useSettings() / GET /api/settings
  → settings cards call app/actions/settings.ts for mutations/security/dangerous actions
  → features/account-settings/server/**
```

Current account settings behavior is documented in `docs/account-settings.md`. Do not add active controls to `/settings/account` unless they are real, read-only, or explicitly disabled future functionality.

### Account dangerous actions

```txt
/settings/account → SensitiveActionsCard
  → leaveWorkspaceAction / transferWorkspaceOwnershipAction / deactivateAccountAction / deleteWorkspaceAction
  → features/account-settings/server/dangerous.actions.ts
  → workspace_members / workspace_invitations / workspace_allowed_domains / owner profile-settings
```

Ownership transfer uses `public.transfer_workspace_ownership(...)` from migration `009_transfer_workspace_ownership.sql` so the implicit `owner_id` workspace boundary moves atomically.

### Workspace team management

```txt
/team
  → features/workspace-settings/components/team-management-view.tsx
  → team-only blocks: overview, members, manual invite, pending invites, roles summary
  → app/api/team/** or app/actions/team.ts
  → lib/auth/team.ts permission helpers
  → public.workspace_* tables / Supabase Auth admin API
```

`/team` is not the catch-all workspace settings screen. Workspace/security controls such as invite links and allowed-domain auto-join rules stay out of the primary team flow until a dedicated workspace/security settings route owns them.

### Directory works backend contract

```txt
/directories/works
  → features/directory-works/** currently owns UI/mocks
  → docs/directory-works-architecture.md fixes the production contract before migrations/API/UI/AI phases
  → db/schema/directory-works.ts and db/migrations/010_directory_works_foundation.sql provide the DB foundation
  → future phases #67-#71 implement read API, CRUD UI binding, import/export, embeddings generation and performance hardening
```

The works catalog must stay workspace-scoped through `workspace_owner_id = workspace_members.owner_id`; do not replace mocks or add API/UI behavior before the phase-specific issue owns that scope.

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
| shadcn primitive                       | `components/ui/*.tsx`                                  |
| Business UI                            | `features/<feature>/components/*.tsx`                  |
| Account settings behavior docs         | `docs/account-settings.md`                             |
| Works catalog backend contract         | `docs/directory-works-architecture.md`                 |

---

## Recent account/team/settings updates

- `app/api/team/members/route.ts` — workspace-scoped team member reads include email identity from Supabase Auth admin lookup, with display-name fallback to email when profile name is empty.
- `lib/auth/activity.ts` and `lib/supabase/proxy.ts` — authenticated non-API navigation touches active `workspace_members.last_active_at` with throttling.
- `features/workspace-settings/components/members/*` — team member rows/mobile lists hide duplicate email display and use `last_active_at` for member activity labels.
- `app/api/settings/route.ts` — account settings read boundary returns `workspaceAccess` and security data using real Auth-derived fields where available.
- `features/account-settings/components/preferences-settings-card.tsx` — interface preferences remain visible but disabled as future functionality until runtime personalization is wired.
- `features/account-settings/components/security-settings-card.tsx` — password reset is active, 2FA is disabled future scope, other sessions can be revoked, and last login is shown from Supabase Auth.
- `features/account-settings/server/password.actions.ts` — owns self password reset email and revoke-other-sessions actions.
- `features/account-settings/server/dangerous.actions.ts` — owns leave workspace, transfer ownership, deactivate account and delete workspace actions for `/settings/account`.

---

## Issue #48 auth/team/access hardening updates

- `lib/auth/team.ts` — authoritative workspace helper layer. Resolves current workspace via `workspace_members.owner_id`, exposes `requireCurrentWorkspace`, `requireWorkspaceMember`, `canReadTeamForWorkspace`, `canManageTeamForWorkspace`, role lookup, and scoped member lookup helpers.
- `lib/auth/invitations.ts` — invitation acceptance helper. Accepts pending invitations from authenticated Supabase user metadata after `/set-password` success; writes only `workspace_members` and deletes the scoped pending invitation.
- `app/(auth)/set-password/page.tsx` and `features/auth/components/invite-password-form.tsx` — password setup/reset flow for hash-token invite/reset links. Browser client updates password; invitation acceptance is called only after success.
- `app/auth/callback/route.ts` — kept for OTP/OAuth/server-readable callback flows.
- `app/api/team/members/**` — workspace-scoped team reads/mutations and password reset.
- `app/api/team/overview/route.ts` — workspace-scoped overview counts and owner metadata.
- `app/api/team/invitations/**` — workspace-scoped list/create/revoke/resend/accept routes; no false invite success on email failure.
- `app/api/team/domains/**` — real `workspace_allowed_domains` storage scoped by workspace; auto-join setting returns explicit 501 until implemented.
- `app/api/team/invite-link/route.ts` — explicit 501 because no authoritative workspace-scoped invite-link storage exists yet.
- `app/api/access-control/roles/route.ts` — now requires authenticated workspace read permission.
- `app/actions/access-control.ts` — workspace role mutations use `workspace_members.role_id`, not global `user_roles`.
- `app/actions/settings.ts` — compatibility server-action wrapper that delegates account settings updates/password reset/session security/dangerous actions to `features/account-settings/server/*`.
- `features/account-settings/server/*` — schemas, repository/service helpers and domain actions for profile/workspace/preferences/notifications/password/dangerous settings.
- `features/account-settings/api/*` and `features/account-settings/hooks/*` — account settings client API/action wrappers and TanStack Query hooks.
- `app/actions/team.ts` and `app/actions/workspace-settings.ts` — dangerous/skeleton actions return explicit Not implemented errors instead of false success.
- `features/account-settings/components/sensitive-actions-card.tsx` — dangerous actions are wired with confirmation dialogs and role-based guards.
- `features/access-control/api/*`, `features/access-control/lib/*`, `features/access-control/hooks/use-permission-matrix-state.ts` — access-control query keys/client, pure matrix builders and draft state for the permissions matrix.
- `features/access-control/components/permissions-matrix.tsx` — save action is disabled/labelled coming soon until persistence is implemented.
- `features/workspace-settings/api/*` and `features/workspace-settings/hooks/*` — workspace/team API client, error mappers, query keys and TanStack Query hooks for members, overview, invitations, domains and invite link.
- `features/workspace-settings/components/members/*` — decomposed team members section, table/mobile views, action/dialog hooks and row/menu/status components.
- `features/auth/components/login-form.tsx`, `features/auth/components/signup-form.tsx` — unimplemented social auth buttons are hidden and replaced with explanatory copy.
