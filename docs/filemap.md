# SmetaLabs — Filemap

> Last updated: 2026-05-14 22:00 UTC
>
> Документация актуальна на 2026-05-14
>
> Canonical compact project map. For layer ownership and architectural rules, see [`docs/architecture.md`](./architecture.md).

---

## Top-level structure

```txt
smetalabs/
├── app/                    # Next.js App Router routes, layouts, API routes, server actions
├── components/             # shared app components and shadcn/ui primitives
├── db/                     # Drizzle client, schema, migrations, seed scripts
├── docs/                   # architecture, backend, filemap, design-system, designer prompt, UI audit
├── features/               # feature-owned UI, hooks and screens
├── hooks/                  # global hooks only (`use-mobile.ts`)
├── lib/                    # shared infra, auth helpers, Supabase clients, utilities
├── public/                 # static assets
├── types/                  # shared cross-feature TypeScript types
├── proxy.ts                # Next middleware entry; delegates to lib/supabase/proxy.ts
├── skills-lock.json        # agent skill lock file
├── .agents/                # agent skill definitions (shadcn)
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
│   ├── settings.ts
│   ├── team.ts
│   └── workspace-settings.ts
│
└── api/
    ├── access-control/roles/route.ts
    ├── settings/route.ts
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
- `app/actions/**` owns server actions.
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
│       ├── set-password-form.tsx
│       └── invite-password-form.tsx
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
└── workspace-settings/
```

Feature folder convention:

```txt
features/<feature>/
├── components/             # feature UI
├── hooks/                  # feature-local client state/data hooks
├── __mocks__/              # temporary/mock data when needed
├── types.ts                # private feature types when needed
└── <subdomain>/components/ # optional deeper decomposition for large features
```

Rules:

- feature UI imports primitives from `@/components/ui/*`;
- feature UI may call API routes or server actions through approved boundaries;
- feature folders should not mutate global app shell unless they are shell-specific files like `app-sidebar.tsx`.

---

## `components/`

```txt
components/
├── ui/                     # shadcn/ui primitives and approved primitive extensions
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
│   └── proxy.ts            # session refresh + route protection
├── auth/
│   ├── actions.ts          # server action helpers
│   ├── invitations.ts      # invitation acceptance logic
│   ├── permissions.ts      # RBAC permission guards
│   └── team.ts             # workspace-scoped member/role helpers
├── calculations.ts         # estimate math utilities
├── formatters.ts           # number, currency, date formatters
└── utils.ts                # generic utilities (cn, etc.)
```

Rules:

- `lib/supabase/proxy.ts` is the source of truth for middleware route protection.
- Auth helper logic belongs in `lib/auth/**`.
- Do not put React screens/components in `lib/`.

---

## `db/`

```txt
db/
├── index.ts                # Drizzle client
├── seed.ts                 # RBAC seed
├── seed-settings.ts        # user settings seed
├── migrations/
│   ├── 002_rls_policies.sql
│   ├── 003_workspace_tables.sql
│   ├── 004_auth_invitation_flow.sql
│   ├── 005_rls_advisor_cleanup.sql
│   └── 006_defer_invite_acceptance.sql
└── schema/
    ├── index.ts
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
  → supabase.auth.admin.inviteUserByEmail(... redirectTo: /set-password)
  → user opens email link
  → Supabase verifies token
  → /set-password
  → features/auth/components/set-password-form.tsx
  → supabase.auth.updateUser({ password })
  → /dashboard
```

### Workspace team management

```txt
/team
  → features/workspace-settings/components/team-management-view.tsx
  → team-only blocks: overview, members, manual invite, pending invites, roles summary
  → app/api/team/** or app/actions/team.ts
  → lib/auth/team.ts permission helpers
  → public.workspace_* tables / Supabase Auth admin API
```

`/team` is not the catch-all workspace settings screen. Workspace/security controls such as invite links, allowed-domain auto-join rules and workspace danger actions stay out of the primary team flow until a dedicated workspace/security settings route owns them.

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
- `app/actions/settings.ts` — JSONB settings updates merge subdocuments rather than replacing omitted keys.
- `app/actions/team.ts` and `app/actions/workspace-settings.ts` — dangerous/skeleton actions return explicit Not implemented errors instead of false success.
- `features/account-settings/components/sensitive-actions-card.tsx` — unimplemented dangerous actions are disabled/labelled coming soon.
- `features/access-control/components/permissions-matrix.tsx` — save action is disabled/labelled coming soon until persistence is implemented.
- `features/auth/components/login-form.tsx`, `features/auth/components/signup-form.tsx` — unimplemented social auth buttons are hidden and replaced with explanatory copy.
