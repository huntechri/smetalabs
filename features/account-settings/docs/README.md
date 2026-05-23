# Настройки аккаунта (Account Settings)

> Статус: production (backend) + not implemented (frontend) | 2026-05-22

## Назначение

Управление персональными настройками пользователя: профиль, workspace, уведомления,
безопасность. Данные хранятся в JSONB-колонках таблицы `user_settings`.

**Маршрут (планируемый):** `/settings` или `/account/settings`
**Фича-директория:** `features/account-settings/` (не создана)

## Структура модуля (реальные файлы)

**Feature-директория `features/account-settings/` не существует.** Ниже — существующие
файлы, реализующие функциональность настроек:

```
lib/auth/
└── permissions.ts                  # isAuthenticated(), requireAuth() — гварды для страниц настроек

lib/supabase/
├── server.ts                       # Серверный клиент (createClient) — чтение/запись user_settings
└── admin.ts                        # Админ-клиент (не для пользовательских настроек)

middleware.ts                       # Защита роутов (все кроме /auth, /api, /_next)

types/
└── roles.ts                        # RoleName, PermissionKey, TeamMember (связанные типы)
```

**Не созданы (требуются для фичи):**
- `features/account-settings/components/` — UI-компоненты
- `features/account-settings/hooks/` — хуки (useAccountSettings, useUpdateProfile)
- `app/(main)/settings/page.tsx` — страница настроек
- `app/api/settings/route.ts` — API для сохранения настроек
- `lib/validators/settings.ts` — Zod-схемы валидации

## Данные (таблицы, типы)

### Таблица БД: `user_settings` (public)

| Колонка | Тип | Примечание |
|---|---|---|
| `user_id` | uuid PK | FK → `profiles.id` |
| `profile` | jsonb | `'{}'` — настройки профиля (имя, аватар, телефон, должность) |
| `workspace` | jsonb | `'{}'` — настройки workspace (название, логотип) |
| `preferences` | jsonb | `'{}'` — пользовательские предпочтения (тема, язык, формат дат) |
| `notifications` | jsonb | `'{}'` — настройки уведомлений |
| `security` | jsonb | `'{}'` — настройки безопасности (2FA и т.д.) |
| `created_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | `now()` |

**Записей в БД:** 3 (на 2026-05-22).

### Связанная таблица: `profiles`

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | FK → `auth.users.id` |
| `full_name` | text nullable | Отображаемое имя |
| `avatar_url` | text nullable | URL аватара |
| `workspace_name` | text nullable | Название workspace |
| `workspace_logo` | text nullable | URL логотипа workspace |
| `phone` | text nullable | Телефон |
| `position` | text nullable | Должность |

**Архитектурное решение:** `profiles` хранит денормализованные данные пользователя
для быстрых JOIN-запросов, `user_settings` — JSONB-корзина для гибких настроек
без изменения схемы.

### Структура JSONB (планируемая)

```typescript
// profile: настройки профиля
{
  full_name?: string
  avatar_url?: string
  phone?: string
  position?: string
}

// workspace: настройки workspace
{
  workspace_name?: string
  workspace_logo?: string
}

// preferences: пользовательские предпочтения
{
  theme?: "light" | "dark" | "system"
  language?: string
  date_format?: string
  currency?: string
}

// notifications: настройки уведомлений
{
  email_notifications?: boolean
  push_notifications?: boolean
  mention_notifications?: boolean
}

// security: настройки безопасности
{
  two_factor_enabled?: boolean
  session_timeout_minutes?: number
}
```

## API (эндпоинты, Server Actions)

**API-эндпоинты и Server Actions для настроек НЕ реализованы.**

### Требуемые эндпоинты

| Метод | Путь | Назначение | RBAC |
|---|---|---|---|
| `GET` | `/api/settings` | Получить настройки текущего пользователя | `isAuthenticated()` |
| `PATCH` | `/api/settings` | Обновить настройки (частичное) | `isAuthenticated()` |
| `POST` | `/api/settings/avatar` | Загрузить аватар (Supabase Storage) | `isAuthenticated()` |

### Планируемая структура ответа

```json
// GET /api/settings → 200
{
  "data": {
    "profile": { "full_name": "...", "phone": "...", "position": "..." },
    "workspace": { "workspace_name": "...", "workspace_logo": "..." },
    "preferences": { "theme": "dark", "language": "ru" },
    "notifications": { "email_notifications": true },
    "security": { "two_factor_enabled": false }
  }
}

// PATCH /api/settings → 200
// Body: { "profile": { "phone": "+7..." }, "preferences": { "theme": "light" } }
// Ответ: обновлённый объект data
```

### Проверка прав

Все эндпоинты настроек требуют только аутентификации (`isAuthenticated()`).
Специфичные RBAC-проверки не требуются — пользователь управляет только своими настройками.

Гвард:
```typescript
import { requireAuth } from '@/lib/auth/permissions'
// В начале каждого handler'а:
await requireAuth()
```

## Компоненты

**Не реализованы.** Планируемая структура (по аналогии с существующими фичами):

```
features/account-settings/
├── components/
│   └── account-settings-view.tsx           # Layout-обёртка
├── account-settings-details/
│   └── components/
│       ├── account-settings-section.tsx     # Секция (табы или аккордеон)
│       ├── profile-settings-form.tsx        # Форма профиля (имя, телефон, должность)
│       ├── workspace-settings-form.tsx      # Форма workspace (название, логотип)
│       ├── preferences-form.tsx             # Предпочтения (тема, язык)
│       ├── notifications-form.tsx           # Настройки уведомлений
│       └── security-settings-form.tsx       # Безопасность (2FA, сессии)
├── hooks/
│   └── use-account-settings.ts             # Хук получения и мутации настроек
└── validators/
    └── account-settings.ts                 # Zod-схемы для каждой JSONB-секции
```

## Tenant boundary

Настройки привязаны к конкретному пользователю (`user_id` PK → `profiles.id`).
Изоляция: пользователь видит и редактирует только свои настройки. RLS на таблице
`user_settings` ограничивает доступ по `auth.uid() = user_id`.

Поле `workspace` в настройках не пересекается с таблицами workspace (это
персональные настройки отображения workspace, а не управление участниками).

## Текущие ограничения

- **Frontend полностью отсутствует.** Нет ни одной страницы, компонента или хука для настроек.
- **API не реализован.** Нет Route Handler'ов в `app/api/settings/`.
- **JSONB-структура не типизирована.** Нет TypeScript-типов для секций настроек.
- **Нет валидации.** Zod-схемы не созданы — `lib/validators/settings.ts` не существует.
- **Загрузка аватара не реализована.** Требуется интеграция с Supabase Storage.
- **Нет миграций для `user_settings`** в последних версиях (таблица создана в ранних миграциях 002–008).
- **Нет синхронизации** между `profiles.full_name` и `user_settings.profile.full_name` (денормализация может расходиться).
