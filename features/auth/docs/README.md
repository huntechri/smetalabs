# Аутентификация и авторизация (auth)

> Статус: ✅ production | 2026-05-22

## Назначение

Модуль отвечает за аутентификацию пользователей (вход, регистрация, восстановление пароля, выход), управление сессиями и ролевую модель доступа (RBAC). Использует **Supabase Auth** как провайдер аутентификации и **Server Actions** (Next.js) для обработки форм.

## Структура модуля

```
features/auth/
  ui/
    auth-illustration.tsx          — декоративная иллюстрация на страницах аутентификации
    login-form.tsx                 — форма входа, использует useLogin
    signup-form.tsx                — форма регистрации, использует useSignup
    forgot-password-form.tsx       — форма восстановления пароля, использует useForgotPassword
    invite-password-form.tsx       — форма установки пароля для приглашённых пользователей, использует useInvitePassword
    set-password-form.tsx          — форма сброса пароля после перехода по ссылке, использует useSetPassword

  model/
    auth-model.ts                  — чистая бизнес-логика (валидация, нормализация ошибок, проверки метаданных)
    auth-model.test.ts             — модульные тесты для доменных хелперов

  application/
    use-login.ts                   — хук оркестрации входа через Server Action
    use-signup.ts                  — хук оркестрации регистрации через Server Action
    use-forgot-password.ts         — хук оркестрации восстановления пароля через Server Action
    use-invite-password.ts         — хук сложной логики приглашений и установки пароля
    use-set-password.ts            — хук установки пароля

app/(auth)/
  layout.tsx                       — лейаут страниц аутентификации (центрирование, фон bg-muted, max-w-sm md:max-w-4xl)
  login/page.tsx                   — страница входа → рендерит <LoginForm />
  signup/page.tsx                  — страница регистрации → рендерит <SignupForm />
  forgot-password/page.tsx         — страница восстановления пароля → рендерит <ForgotPasswordForm />
  set-password/page.tsx            — страница установки пароля → рендерит <InvitePasswordForm />

lib/
  auth/
    actions.ts                     — Server Actions: loginAction, signupAction, forgotPasswordAction, signOutAction
    activity.ts                    — отслеживание активности workspace (touchWorkspaceActivity)
    invitations.ts                 — логика приглашений в workspace
    permissions.ts                 — проверки разрешений (hasPermission, requirePermission, …)
    team.ts                        — управление командой workspace (роли, участники)
  supabase/
    client.ts                      — браузерный Supabase-клиент (createBrowserClient из @supabase/ssr)
    server.ts                      — серверный Supabase-клиент (cookies через next/headers)
    proxy.ts                       — Next.js middleware (обновление сессии + защита маршрутов)
    admin.ts                       — админ-клиент (service_role key, только сервер)
```

## Данные (таблицы Supabase Auth + RBAC)

| Таблица | Назначение | Основные поля |
|---------|-----------|--------------|
| `profiles` | Профили пользователей | `id`, `full_name`, `avatar_url`, `workspace_name`, `phone`, `position`, `created_at` |
| `roles` | Роли | `id`, `name`, `label`, `locked`, `description`, `created_at` |
| `permissions` | Разрешения | `id`, `key`, `label`, `group_name` |
| `user_roles` | Связь пользователь↔роль | `user_id`, `role_id`, `assigned_by`, `created_at` |
| `role_permissions` | Связь роль↔разрешение | `role_id`, `permission_id` |

### Роли (предустановленные)

| Роль | Права |
|------|-------|
| `owner` | Все права (billing, estimates, projects, purchases, team) |
| `admin` | Всё кроме `billing.manage` |
| `manager` | estimates.*, projects.*, purchases.*, team.read |
| `estimator` | estimates.*, projects.read, purchases.read |
| `viewer` | Только чтение (billing.read, estimates.read, projects.read, purchases.read, team.read) |

### Ключи разрешений (19 ключей)

- `billing.read`, `billing.manage`
- `estimates.read`, `estimates.create`, `estimates.update`, `estimates.delete`
- `projects.read`, `projects.create`, `projects.update`, `projects.delete`
- `purchases.read`, `purchases.create`, `purchases.update`, `purchases.delete`
- `team.read`, `team.create`, `team.update`, `team.delete`, `team.manage`

## Server Actions (аутентификация)

Файл `lib/auth/actions.ts` содержит все Server Actions для аутентификации. **Все формы подключены к Supabase Auth** через эти действия.

### `loginAction`

- **Валидация:** Zod-схема `{ email: z.string().email(), password: z.string().min(1) }`
- **Вызов:** `supabase.auth.signInWithPassword()`
- **При успехе:** `revalidatePath("/", "layout")` + `redirect("/dashboard")`
- **При ошибке:** локализованные сообщения на русском (неверный пароль, email не подтверждён, rate limit)

### `signupAction`

- **Валидация:** Zod-схема `{ email, password: min(8), confirmPassword }` + проверка совпадения паролей
- **Вызов:** `supabase.auth.signUp()` с `emailRedirectTo: ${origin}/auth/callback`
- **При успехе:** форма показывает экран «Проверьте почту» с указанием email
- **При ошибке:** локализованное сообщение (пользователь уже существует, слабый пароль)

### `forgotPasswordAction`

- **Валидация:** Zod-схема `{ email: z.string().email() }`
- **Вызов:** `supabase.auth.resetPasswordForEmail()` с `redirectTo: ${origin}/set-password`
- **При успехе:** форма показывает экран «Проверьте почту»
- **При ошибке:** локализованное сообщение

### `signOutAction`

- **Вызов:** `supabase.auth.signOut()`
- **После:** `revalidatePath("/", "layout")` + `redirect("/login")`

### Локализация ошибок

Все сообщения об ошибках Supabase переведены на русский через функцию `getAuthErrorMessage()`:

| Оригинал (Supabase) | Русский |
|---------------------|---------|
| `invalid login credentials` | «Неверный email или пароль» |
| `email not confirmed` | «Подтвердите email перед входом» |
| `user already registered` | «Пользователь с таким email уже зарегистрирован» |
| `password … weak` | «Пароль слишком простой» |
| `rate limit / too many` | «Слишком много попыток. Попробуйте позже» |

## Формы аутентификации

**Все формы полностью подключены к Supabase Auth** через Next.js Server Actions (`useActionState`):

### `LoginForm`

- **Обработчик:** `useActionState(loginAction, initialState)`
- **Поля:** email, пароль
- **Состояния:** загрузка (Spinner), ошибка (красный текст), успех (редирект)
- **Ссылки:** «Забыли пароль?» → `/forgot-password`, «Зарегистрироваться» → `/signup`
- **Примечание:** OAuth-вход не подключён (текст «Социальный вход пока не подключён»)

### `SignupForm`

- **Обработчик:** `useActionState(signupAction, initialState)`
- **Поля:** email, пароль, подтверждение пароля
- **Состояния:** загрузка, ошибка валидации, ошибка сервера, успех (экран «Проверьте почту» с email получателя)
- **Валидация:** пароль ≥ 8 символов, пароли должны совпадать
- **Примечание:** OAuth-вход не подключён

### `ForgotPasswordForm`

- **Обработчик:** `useActionState(forgotPasswordAction, initialState)`
- **Поля:** email
- **Состояния:** загрузка, ошибка, успех (экран «Проверьте почту»)
- **Ссылка:** «Войти» → `/login`

### `AuthIllustration`

Декоративный компонент — фоновое изображение справа от формы на десктопе (`md:` breakpoint). Использует `next/image` с `priority` и `fill`. В тёмной теме применяется `brightness-[0.2] dark:grayscale`.

## Middleware (защита маршрутов)

Файл `lib/supabase/proxy.ts` (`updateSession`):

- **Обновление сессии** Supabase через cookies
- **Auth callback:** `/auth/callback` всегда разрешён (OAuth, email confirmation)
- **Set password:** `/set-password` разрешён без сессии (для приглашённых)
- **Auth-страницы** (`/login`, `/signup`, `/forgot-password`) — только для неаутентифицированных. С сессией → редирект на `/dashboard`
- **Admin** (`/admin/*`) — требует аутентификации
- **API** (`/api/*`) — пропускается (роуты сами проверяют авторизацию)
- **Публичные:** `/` (лендинг) и `/auth/*`
- **Защищённые маршруты:** все остальные — без сессии → редирект на `/login`
- **Активность:** `touchWorkspaceActivity()` вызывается для всех аутентифицированных запросов (кроме API)

## Permissions (проверки разрешений)

Файл `lib/auth/permissions.ts` — серверные функции для проверки прав доступа:

| Функция | Назначение |
|---------|-----------|
| `getCurrentUserId()` | Получить ID текущего пользователя |
| `getCurrentWorkspaceRoleIds()` | Получить роли в текущем workspace |
| `hasPermission(key)` | Проверить одно разрешение |
| `hasAnyPermission(keys)` | Проверить любое из списка |
| `hasAllPermissions(keys)` | Проверить все из списка |
| `canManageProjects()` | Может управлять проектами |
| `canManageEstimates()` | Может управлять сметами |
| `canManageTeam()` | Может управлять командой |
| `canViewBilling()` | Может видеть биллинг |
| `requirePermission(key)` | Guard: бросить ошибку если нет права |
| `requireAnyPermission(keys)` | Guard: бросить если нет ни одного права |
| `isAuthenticated()` | Проверить наличие сессии |
| `requireAuth()` | Guard: бросить если не авторизован |

Все функции — серверные (async, используют `createClient()` из `lib/supabase/server`).

## Team management

Файл `lib/auth/team.ts` — управление командой workspace:

- `getPrimaryWorkspace(userId)` — получить основной workspace пользователя
- `getWorkspaceRole(userId, ownerId)` — получить роль в workspace
- `requireWorkspaceMember(userId, ownerId)` — проверить членство, бросить если нет
- `requireCurrentWorkspace()` — получить текущий workspace
- `canManageTeamForWorkspace(userId, ownerId)` — проверить право управления командой

## Supabase-клиенты

| Клиент | Файл | Функция | Использование |
|--------|------|---------|---------------|
| Browser | `lib/supabase/client.ts` | `createBrowserClient` | Client Components |
| Server | `lib/supabase/server.ts` | `createServerClient` + cookies | Server Components, Route Handlers, Server Actions |
| Proxy | `lib/supabase/proxy.ts` | `createServerClient` + NextRequest | Middleware |
| Admin | `lib/supabase/admin.ts` | `createClient` + service_role | Только сервер (seed, админ-операции) |

Переменные окружения:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (только админ-клиент)

## API (управление командой)

```
app/api/team/
  members/route.ts         — GET (список), POST (назначить роль), DELETE (снять роль)
  roles/route.ts           — GET (список), POST (создать роль)
  invitations/             — управление приглашениями
  domains/                 — управление разрешёнными доменами
  overview/route.ts        — обзор workspace
  invite-link/route.ts     — управление ссылкой-приглашением
```

### Эндпоинты

| Метод | Путь | Назначение | Доступ |
|-------|------|-----------|--------|
| `GET` | `/api/team/members` | Список участников с ролями | Аутентифицированные |
| `POST` | `/api/team/members` | Назначить роль пользователю | `team.manage` |
| `DELETE` | `/api/team/members?user_id=&role_id=` | Снять роль | `team.manage` |
| `GET` | `/api/team/roles` | Список ролей с правами | Аутентифицированные |
| `POST` | `/api/team/roles` | Создать новую роль | `team.manage` |

**Детали реализации:**

- `DELETE /api/team/members` проверяет флаг `locked` у роли и запрещает снятие заблокированных ролей (возвращает 403)
- `POST /api/team/members` проверяет существование пользователя и роли, использует upsert
- `POST /api/team/roles` проверяет уникальность имени и опционально принимает `permission_ids`

## Tenant boundary

- **Supabase Auth** хранит пользователей глобально (email/password)
- **RBAC** (`user_roles`, `roles`, `role_permissions`) — данные уровня workspace через `workspace_owner_id`/`ownerId`
- **Permissions API** использует `getPrimaryWorkspace()` и `requireCurrentWorkspace()` для изоляции по workspace
- Каждый пользователь может иметь разные роли в разных workspace

## Текущие ограничения

1. **Нет OAuth-интеграции:** социальный вход (Google, Apple, Meta) не подключён. Формы содержат явное сообщение «Социальный вход пока не подключён».
2. **Нет client-side хуков:** нет `useAuth()`, `useUser()`, `usePermissions()` для реактивного UI в клиентских компонентах.
3. **Нет обработки callback:** отсутствует `app/auth/callback/` для завершения OAuth/OTP-флоу (но middleware разрешает этот путь).
4. **Парольная аутентификация только:** только email + пароль. Нет 2FA, magic link, phone auth.
5. **Ограниченная обработка ошибок:** ошибки Supabase Auth локализованы, но не все edge-кейсы покрыты (например, сетевые ошибки).
