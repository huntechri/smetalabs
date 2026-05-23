# Управление доступом (Access Control / RBAC)

> Статус: production (backend) + mock (frontend) | 2026-05-22

## Назначение

Ролевая модель управления доступом (RBAC) для multi-tenant workspace.
5 ролей × 19 прав = полная матрица доступа. Реализована на трёх уровнях:
БД (таблицы + RLS), серверная логика (`lib/auth/permissions.ts`), API Routes.

**Маршрут:** `/team` — управление командой и ролями

## Структура модуля (реальные файлы)

```
lib/auth/
└── permissions.ts                       # 11 функций RBAC-проверок (ядро системы)

lib/validators/
└── team.ts                              # Zod-схемы: AssignRole, CreateRole, RemoveRole

types/
└── roles.ts                             # 9 типов + матрица ролей ROLE_PERMISSION_MATRIX

app/api/team/
├── members/route.ts                     # GET (список), POST (назначить роль), DELETE (снять роль)
└── roles/route.ts                       # GET (список ролей с правами), POST (создать роль)

middleware.ts                            # Guardian: проверка сессии, защита роутов

lib/supabase/
└── server.ts                            # Серверный клиент (куки) — используется в permissions.ts
```

**Всего файлов с RBAC-логикой:** 7 (permissions.ts, validators/team.ts, types/roles.ts,
2 route handler'а, middleware.ts, server.ts).

## Данные (таблицы, типы)

### Таблицы БД (схема public)

#### `roles` — определения ролей (5 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `name` | text UNIQUE | `owner`, `admin`, `manager`, `estimator`, `viewer` |
| `label` | text | Человекочитаемое: «Владелец», «Администратор»… |
| `locked` | bool | Системные роли (`owner`, `admin`, `manager`) нельзя удалить |
| `description` | text nullable | Описание роли |
| `created_at` | timestamptz | `now()` |

#### `permissions` — определения прав (19 записей, 5 групп)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `key` | text UNIQUE | `billing.read`, `estimates.create`, `team.manage`… |
| `label` | text | Человекочитаемое название |
| `group_name` | text | `billing`, `estimates`, `projects`, `purchases`, `team` |
| `description` | text nullable | |
| `created_at` | timestamptz | `now()` |

#### `role_permissions` — связи роль→право (61 запись: 19+18+13+6+5)

| Колонка | Тип | Примечание |
|---|---|---|
| `role_id` | uuid PK | FK → `roles.id` |
| `permission_id` | uuid PK | FK → `permissions.id` |

#### `user_roles` — связи пользователь→роль (1 запись на 2026-05-22)

| Колонка | Тип | Примечание |
|---|---|---|
| `user_id` | uuid PK | FK → `profiles.id` |
| `role_id` | uuid PK | FK → `roles.id` |
| `assigned_by` | uuid nullable | FK → `profiles.id` (кто назначил) |
| `created_at` | timestamptz | `now()` |

### Матрица ролей (ROLE_PERMISSION_MATRIX из types/roles.ts)

| Право | owner | admin | manager | estimator | viewer |
|---|---|---|---|---|---|
| `billing.read` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `billing.manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `estimates.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `estimates.create` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `estimates.update` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `estimates.delete` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `projects.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `projects.create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `projects.update` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `projects.delete` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `purchases.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `purchases.create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `purchases.update` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `purchases.delete` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `team.read` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `team.create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `team.update` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `team.delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `team.manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Всего прав** | **19** | **18** | **13** | **6** | **5** |

### Типы TypeScript (types/roles.ts)

```typescript
export type RoleName = 'owner' | 'admin' | 'manager' | 'estimator' | 'viewer'
export type PermissionKey =
  | 'billing.read' | 'billing.manage'
  | 'estimates.read' | 'estimates.create' | 'estimates.update' | 'estimates.delete'
  | 'projects.read' | 'projects.create' | 'projects.update' | 'projects.delete'
  | 'purchases.read' | 'purchases.create' | 'purchases.update' | 'purchases.delete'
  | 'team.read' | 'team.create' | 'team.update' | 'team.delete' | 'team.manage'
export type PermissionGroup = 'billing' | 'estimates' | 'projects' | 'purchases' | 'team'

export interface Role { id, name, label, locked, description, created_at }
export interface Permission { id, key, label, group_name, description, created_at }
export interface RolePermission { role_id, permission_id }
export interface UserRole { user_id, role_id, assigned_by, created_at }
export interface TeamMember { user_id, full_name, avatar_url, workspace_name, phone, position, roles: Role[] }

export const ROLE_PERMISSION_MATRIX: Record<RoleName, PermissionKey[]>   // 5×19 матрица
export const WRITE_ROLES: RoleName[] = ['owner', 'admin', 'manager']
export const READ_ONLY_ROLES: RoleName[] = ['estimator', 'viewer']
```

## API (эндпоинты, Server Actions)

### `GET /api/team/roles` — список ролей с правами

**Аутентификация:** обязательна (401 если нет сессии).
**Авторизация:** не требуется (все аутентифицированные пользователи видят роли).

**Ответ 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "admin",
      "label": "Администратор",
      "locked": true,
      "description": "...",
      "created_at": "...",
      "permissions": [
        { "id": "uuid", "key": "team.manage", "label": "...", "group_name": "team" }
      ]
    }
  ]
}
```

**Реализация:** `GET /api/team/roles` — два запроса к Supabase:
1. `supabase.from('roles').select('*')`
2. `supabase.from('role_permissions').select('role_id, permissions!inner(id, key, label, group_name)')`
3. Группировка permissions по role_id через Map.

### `POST /api/team/roles` — создание роли

**Аутентификация:** обязательна.
**Авторизация:** `canManageTeam()` — только owner и admin (право `team.manage`).

**Body:** `{ name: string, label: string, description?: string, permission_ids?: string[] }`
**Ответ 201:** `{ data: { id, name, label, ... } }`
**Ошибки:** 400 (нет name/label), 403 (нет прав), 409 (дубликат name).

### `GET /api/team/members` — список участников workspace

**Аутентификация:** обязательна.
**Авторизация:** не требуется (но RLS фильтрует по workspace).

**Ответ 200:**
```json
{
  "data": [
    {
      "user_id": "uuid",
      "full_name": "...",
      "avatar_url": "...",
      "workspace_name": "...",
      "phone": "...",
      "position": "...",
      "roles": [{ "id": "uuid", "name": "admin", "label": "...", "locked": true }]
    }
  ],
  "meta": { "total": 3 }
}
```

**Реализация:** три запроса к Supabase:
1. `profiles` — список всех профилей
2. `user_roles` с `roles!inner(...)` — роли каждого пользователя
3. Группировка ролей по `user_id` через Map.

### `POST /api/team/members` — назначить роль

**Авторизация:** `canManageTeam()` — только owner/admin.

**Body:** `{ user_id: string, role_id: string }`
**Действие:** upsert в `user_roles` с `onConflict: 'user_id,role_id'`.
**Ответ 201:** `{ data: { user_id, role_id } }`
**Ошибки:** 400 (нет полей), 403 (нет прав), 404 (пользователь/роль не найдены), 409 (уже назначена).

### `DELETE /api/team/members?user_id=...&role_id=...` — снять роль

**Авторизация:** `canManageTeam()`.
**Особенность:** нельзя снять locked-роль (проверка `role.locked` перед удалением).
**Ответ 200:** `{ data: { removed: true } }`
**Ошибки:** 400, 403 (нет прав или роль locked).

### Функции проверки прав (lib/auth/permissions.ts)

```typescript
// Основные (используют БД: user_roles → role_permissions → permissions)
getUserRoles(): Promise<RoleName[]>                // Роли текущего пользователя
getUserPermissions(): Promise<PermissionKey[]>      // Развёрнутые права
hasPermission(key): Promise<boolean>                // Одно право
hasAnyPermission(keys): Promise<boolean>            // Хотя бы одно
hasAllPermissions(keys): Promise<boolean>           // Все права

// Guard'ы (бросают Error при отсутствии прав)
requirePermission(key): Promise<void>
requireAnyPermission(keys): Promise<void>

// Семантические хелперы
canManageProjects(): Promise<boolean>        // projects.create | update | delete
canManageEstimates(): Promise<boolean>       // estimates.create | update | delete
canManageTeam(): Promise<boolean>            // team.manage
canViewBilling(): Promise<boolean>           // billing.read

// Аутентификация
isAuthenticated(): Promise<boolean>          // Есть активная сессия
requireAuth(): Promise<void>                 // Guard: бросает если нет сессии
```

**Реализация permissions.ts:**
1. `getUserRoles()` — `user_roles` → `roles!inner(name)` для `auth.uid()`
2. `getUserPermissions()` — получает `role_id` → `role_permissions` → `permissions!inner(key)`
3. Все семантические хелперы — обёртки над `hasPermission()` / `hasAnyPermission()`
4. Никакого кэширования — каждый вызов делает запрос к БД

## Компоненты

**UI-компоненты управления доступом не выделены в отдельную фичу.**
Страница `/team` рендерит список участников напрямую в `page.tsx`.

### Использование RBAC в коде

```typescript
// app/api/team/members/route.ts — пример guard clause
export async function POST(request: Request) {
  const canManage = await canManageTeam()
  if (!canManage) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN' } }, { status: 403 }
    )
  }
  // ... основная логика
}
```

### Будущая структура фичи (планируемая)

```
features/access-control/
├── components/
│   ├── access-control-view.tsx              # Layout-обёртка
│   ├── team-members-table.tsx               # Таблица участников с ролями
│   ├── invite-member-dialog.tsx             # Диалог приглашения
│   ├── role-badge.tsx                       # Бейдж роли
│   └── permission-matrix-view.tsx           # Визуализация матрицы прав
├── hooks/
│   ├── use-team-members.ts                  # Хук списка участников
│   └── use-roles.ts                         # Хук списка ролей
└── validators/
    └── access-control.ts                    # Zod-схемы (уже есть в lib/validators/team.ts)
```

## Tenant boundary

- RBAC-таблицы (`roles`, `permissions`, `role_permissions`) — **глобальные**, не привязаны
  к конкретному workspace. Определения ролей и прав едины для всей системы.
- `user_roles` — привязана к пользователю через `user_id` → `profiles.id`.
  Роль действует в контексте workspace'а пользователя.
- RLS на `profiles` ограничивает видимость других пользователей по `workspace_owner_id`.

**Архитектурное решение:** права глобальны, назначения — per-workspace.
Это позволяет разным workspace'ам иметь независимые наборы ролей у участников.

## Текущие ограничения

- **Нет UI для страницы `/team`** — используется заглушка (inline-вёрстка в page.tsx,
  без выделенной фичи).
- **Нет компонента приглашения** участников (хотя таблица `workspace_invitations` существует).
- **Нет визуализации матрицы прав** — только программный доступ через ROLE_PERMISSION_MATRIX.
- **Нет кэширования прав** — каждый вызов `hasPermission()` делает запрос к БД.
  При частых проверках это создаёт избыточную нагрузку.
- **Нет batch-проверок** — каждая проверка прав выполняется отдельно (3 запроса:
  user_roles → role_permissions → permissions).
- **Невозможно создать кастомную роль через UI** — только через API (`POST /api/team/roles`).
- **Нет аудит-лога** изменений ролей (только `assigned_by` и `created_at`).
- **Нет страницы настроек доступа** — назначение ролей только через API, не через UI.
- **Middleware не проверяет права** — только аутентификацию. RBAC полностью на уровне Route Handler'ов.
