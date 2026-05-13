# SmetaLabs — Account Settings Contract

> Last updated: 2026-05-13
>
> Scope: `/settings/account`, `app/api/settings`, `app/actions/settings`, and `features/account-settings/**` after PR #59, PR #60, and PR #61.

This document describes the current production-facing behavior of account settings. It is intentionally narrow: it documents what is real, what is read-only, and what remains future scope so UI controls do not imply functionality that is not implemented.

---

## 1. Route and ownership

`/settings/account` is an authenticated route inside `app/(main)/**`.

Current screen composition:

```txt
app/(main)/settings/account/page.tsx
  → features/account-settings/components/account-settings-view.tsx
    → ProfileSettingsCard
    → WorkspaceSettingsCard
    → PreferencesSettingsCard
    → NotificationSettingsCard
    → SecuritySettingsCard
    → SensitiveActionsCard
```

Layer ownership:

- `app/api/settings/route.ts` owns JSON reads for the page.
- `app/actions/settings.ts` is a compatibility server-action wrapper.
- `features/account-settings/server/**` owns account-settings domain actions, schemas, repositories and services.
- `features/account-settings/api/**` owns client API/action adapters and query keys.
- `features/account-settings/hooks/**` owns TanStack Query hooks and mutations.
- `features/account-settings/components/**` owns account-settings UI only.

---

## 2. Settings read contract

`GET /api/settings` returns merged settings for the authenticated user:

```txt
{
  data: {
    profile,
    workspace,
    workspaceAccess,
    preferences,
    notifications,
    security
  },
  meta: { updatedAt }
}
```

The route must authenticate through the SSR Supabase client before reading data. Queries that use the server-side service-role client must remain scoped manually by the current user or current workspace owner.

Current merge rules:

- `profile` combines public identity from `profiles` with account-local `user_settings.profile` values such as language and timezone.
- `workspace` is resolved through the current workspace owner, not each member's own settings row.
- `workspaceAccess` exposes the current workspace role and whether the user can edit workspace settings.
- `preferences` is read from `user_settings.preferences`, but the UI currently treats it as future functionality.
- `notifications` is read from `user_settings.notifications` and represents preferences only, not a delivery system.
- `security` must use real Supabase Auth data where available rather than stale `user_settings.security` display fields.

---

## 3. Profile card

The profile card is a real editable account feature.

It may update:

```txt
profiles.full_name
profiles.phone
profiles.position
user_settings.profile.language
user_settings.profile.timezone
```

Rules:

- the email field is identity data from Supabase Auth and must not be treated as an editable profile field unless a dedicated email-change flow is implemented;
- profile writes are user-scoped;
- partial JSONB settings updates must merge subdocuments instead of overwriting omitted keys.

---

## 4. Workspace card

The workspace card displays current workspace data using the implicit workspace boundary:

```txt
workspace_members.owner_id = current workspace identity
```

After PR #59, workspace settings are owned by the workspace owner profile/settings row:

- workspace name comes from the workspace owner's `profiles.workspace_name`;
- legal/company settings come from the workspace owner's `user_settings.workspace`;
- non-owner workspace members get read-only display;
- only the workspace owner can edit workspace settings through the current account settings UI.

This is a temporary contract while the project still uses `owner_id` as the workspace boundary. After an explicit `workspaces` table is introduced, these fields should migrate from owner-owned profile/settings rows to workspace-owned records.

---

## 5. Interface preferences card

`user_settings.preferences` exists as a future personalization store:

```txt
theme
density
dateFormat
numberFormat
defaultEstimateView
```

After PR #60, the `Настройки интерфейса` card remains visible but is explicitly disabled.

Current behavior:

- the card explains that interface personalization is in development;
- selectors are disabled;
- save is disabled and labelled `Функция в разработке`;
- no write is performed from the UI;
- `user_settings.preferences` and existing backend helpers remain in place for future implementation.

Reason: these preferences are not yet wired into runtime application behavior. `theme` does not control `next-themes`, `density` does not change global spacing, date/number formats are not applied through global formatters, and `defaultEstimateView` is not consumed by the estimates feature.

Do not re-enable this card until at least one setting has real runtime effect and the UI copy clearly describes what is applied.

---

## 6. Notification settings card

`user_settings.notifications` stores account-level notification preferences only.

Current state:

- preferences can be saved as JSONB settings;
- there is no notification event table;
- there is no in-app notification center;
- there is no email delivery pipeline;
- there is no delivery log, retry worker, digest worker, or unread count.

The notification settings card must not imply that real delivery is implemented. It represents preferences for future notification architecture.

For full notification-system design, use a future dedicated document such as `docs/notifications-architecture.md` before implementation.

---

## 7. Security card

After PR #61, the security card has three production-facing behaviors and one future placeholder.

### Password reset/change

The `Сменить пароль` action is real.

Flow:

```txt
SecuritySettingsCard
  → sendOwnPasswordResetEmailAction()
  → features/account-settings/server/password.actions.ts
  → Supabase Auth resetPasswordForEmail(currentUser.email, redirectTo: /set-password)
```

The UI copy must make clear that the app sends a password-change email. It is not an inline password editor.

### Other sessions

The `Другие сессии → Завершить другие` action is real.

Flow:

```txt
SecuritySettingsCard
  → revokeOtherSessionsAction()
  → Supabase Auth signOut({ scope: "others" })
```

This ends other sessions while preserving the current session. The UI must not show a fake device count because the current implementation does not enumerate active devices.

Operational note: Supabase Auth revokes refresh tokens for the affected sessions. Already-issued access tokens may remain valid until expiry.

### Last login

`Последний вход` must be sourced from Supabase Auth `user.last_sign_in_at` when returned by the authenticated user object.

It must not depend on `user_settings.security.lastLogin`, because that JSONB field is not a reliable login-event source and is not updated by the auth flow.

### 2FA

2FA/MFA is not implemented.

Current UI:

- no status badge;
- one disabled button: `Настроить · скоро`;
- explanatory copy says it will be connected separately.

Do not display `Включена` / `Выключена` unless the value comes from a real Supabase MFA factor check or another authoritative backend source.

---

## 8. Sensitive actions card

Dangerous account/workspace actions remain disabled or future-scope unless explicitly implemented with production-safe backend behavior.

Rules:

- no false `{ success: true }` for actions that are not implemented;
- no destructive operation should be exposed without explicit auth checks and confirmation UI;
- workspace-level destructive actions do not belong in account settings unless the route owns a clear workspace/security contract.

---

## 9. Team member identity and activity from PR #59

PR #59 changed team/account-adjacent behavior:

- team members now use Supabase Auth admin lookup to resolve email by user id in `GET /api/team/members`;
- member display name falls back to email when `profiles.full_name` is empty;
- member email is shown only when it differs from the display name;
- `last_active_at` is updated through `lib/auth/activity.ts` from `lib/supabase/proxy.ts` for authenticated non-API navigations;
- the update is throttled to avoid writing to `workspace_members` on every request.

This activity signal is workspace-membership activity, not a full audit log or exact online-presence feature.

---

## 10. Current non-goals

Do not implement these as incidental account-settings work:

- full MFA enrollment / challenge / unenrollment;
- active-device list with user-agent/IP/location metadata;
- notification delivery system;
- global theme/density runtime personalization;
- deleting account or deleting/transferring workspace ownership;
- migrating from `owner_id` workspace boundary to explicit `workspaces` table.

Each item requires a dedicated issue, backend contract, and documentation update.

---

## 11. Documentation rule for account settings

Any PR that changes `/settings/account` user-visible behavior must update one of:

```txt
docs/account-settings.md
docs/filemap.md
docs/architecture.md
docs/design-system.md
```

Use `docs/account-settings.md` for behavior contracts and feature status. Use `docs/design-system.md` only when a visual pattern, primitive usage rule, token, spacing rule or reusable UI convention changes.
