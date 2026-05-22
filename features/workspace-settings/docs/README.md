# Настройки workspace (Workspace Settings)

> Статус: production (backend) + not implemented (frontend) | 2026-05-22

## Назначение

Управление рабочим пространством (workspace): участники, приглашения, доменные ограничения.
Реализовано на уровне БД (3 таблицы) и API Routes (управление ролями участников).
Frontend отсутствует — страница `/team` использует заглушку.

**Маршрут:** `/team` — список участников, назначение ролей
**Связанные таблицы:** `workspace_members`, `workspace_invitations`, `workspace_allowed_domains`

## Структура модуля (реальные файлы)

**Feature-директория `features/workspace-settings/` не существует.** Ниже — существующие
файлы, реализующие функциональность workspace:

```
app/api/team/
├── members/route.ts                     # GET (список участников), POST (назначить роль), DELETE (снять)
└── roles/route.ts                       # GET (список ролей), POST (создать роль)

lib/auth/
└── permissions.ts                       # canManageTeam(), requireAuth() — гварды для операций с командой

lib/validators/
└── team.ts                              # Zod-схемы: AssignRoleSchema, CreateRoleSchema, RemoveRoleSchema

types/
└── roles.ts                             # TeamMember, UserRole, Role, RoleName

middleware.ts                            # Защита роутов /team и /settings

lib/supabase/
└── server.ts                            # Серверный клиент для чтения profiles, workspace_members
```

**Не созданы (требуются для фичи — 16 компонентов):**
- `features/workspace-settings/components/` — UI-компоненты
- `features/workspace-settings/hooks/` — хуки для управления workspace
- `app/api/workspace/` — API для приглашений и доменов
- `app/(main)/team/` — страница с полноценным UI
- `app/(main)/settings/workspace/` — страница настроек workspace

## Данные (таблицы, типы)

### Таблица: `workspace_members` (public, 3 записи)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `user_id` | uuid | FK → `profiles.id` |
| `owner_id` | uuid | FK → `profiles.id` (владелец workspace) |
| `role_id` | uuid | FK → `roles.id` |
| `status` | enum | `active`, `invited`, `suspended` |
| `joined_at` | timestamptz nullable | Дата вступления |
| `last_active_at` | timestamptz nullable | Последняя активность |
| `created_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | `now()` |

**Примечание:** таблица частично дублирует `user_roles`, но добавляет статус
участника (`active`, `suspended`) и аудит-поля. Возможно, в будущем `user_roles`
будет удалена в пользу `workspace_members`.

### Таблица: `workspace_invitations` (public, 0 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `email` | text | Email приглашаемого |
| `role_id` | uuid | FK → `roles.id` (роль при приглашении) |
| `invited_by` | uuid | FK → `profiles.id` (кто пригласил) |
| `owner_id` | uuid | FK → `profiles.id` (владелец workspace) |
| `message` | text nullable | Персональное сообщение |
| `invited_at` | timestamptz | `now()` |
| `expires_at` | timestamptz | Срок действия приглашения |
| `status` | enum | `pending`, `expired` |
| `created_at` | timestamptz | `now()` |

### Таблица: `workspace_allowed_domains` (public, 0 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `domain` | text | Домен (например, `example.com`) |
| `owner_id` | uuid | FK → `profiles.id` |
| `added_by` | uuid | FK → `profiles.id` |
| `added_at` | timestamptz | |
| `created_at` | timestamptz | `now()` |

**Назначение:** ограничение регистрации — только email'ы с указанных доменов
могут быть приглашены в workspace. Сейчас не используется (0 записей).

### Типы TypeScript

```typescript
// types/roles.ts — существующие типы для команды
export interface TeamMember {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  workspace_name: string | null
  phone: string | null
  position: string | null
  roles: Role[]
}

export interface UserRole {
  user_id: string
  role_id: string
  assigned_by: string | null
  created_at: string
}
```

**Не типизированы (требуются):**
- `WorkspaceMember` — тип строки `workspace_members`
- `WorkspaceInvitation` — тип строки `workspace_invitations`
- `WorkspaceAllowedDomain` — тип строки `workspace_allowed_domains`

### Связанные таблицы

| Таблица | Связь |
|---|---|
| `profiles` | `workspace_members.user_id` → `profiles.id` |
| `roles` | `workspace_members.role_id` → `roles.id` |
| `user_roles` | Назначение ролей (частично дублирует workspace_members) |
| `auth.users` | Supabase Auth — не в public-схеме, но FK через profiles |

## API (эндпоинты, Server Actions)

### Реализованные эндпоинты

| Метод | Путь | Назначение | RBAC |
|---|---|---|---|
| `GET` | `/api/team/members` | Список участников с ролями | Аутентификация |
| `POST` | `/api/team/members` | Назначить роль участнику | `canManageTeam()` |
| `DELETE` | `/api/team/members` | Снять роль (query: user_id, role_id) | `canManageTeam()` |
| `GET` | `/api/team/roles` | Список доступных ролей | Аутентификация |
| `POST` | `/api/team/roles` | Создать новую роль | `canManageTeam()` |

**Формат ответа GET /api/team/members:**
```json
{
  "data": [
    {
      "user_id": "uuid",
      "full_name": "Иван Иванов",
      "avatar_url": null,
      "workspace_name": "СтройПроект",
      "phone": "+7 (999) 123-45-67",
      "position": "Главный инженер",
      "roles": [
        { "id": "uuid", "name": "admin", "label": "Администратор", "locked": true }
      ]
    }
  ],
  "meta": { "total": 3 }
}
```

### Нереализованные эндпоинты (требуются)

| Метод | Путь | Назначение |
|---|---|---|
| `POST` | `/api/workspace/invitations` | Отправить приглашение по email |
| `GET` | `/api/workspace/invitations` | Список активных приглашений |
| `DELETE` | `/api/workspace/invitations/:id` | Отозвать приглашение |
| `POST` | `/api/workspace/invitations/:token/accept` | Принять приглашение (публичный) |
| `GET` | `/api/workspace/domains` | Список разрешённых доменов |
| `POST` | `/api/workspace/domains` | Добавить домен |
| `DELETE` | `/api/workspace/domains/:id` | Удалить домен |
| `PATCH` | `/api/workspace/members/:id` | Изменить статус участника (suspend/activate) |
| `DELETE` | `/api/workspace/members/:id` | Удалить участника из workspace |

## Компоненты (планируемая структура — 16 компонентов)

```
features/workspace-settings/
├── components/
│   └── workspace-settings-view.tsx               # 1. Layout-обёртка (табы: Участники / Приглашения / Домены)
├── workspace-settings-details/
│   └── components/
│       ├── workspace-members-section.tsx          # 2. Секция участников (хук → таблица)
│       ├── workspace-members-table.tsx            # 3. Таблица участников (TanStack Table)
│       ├── workspace-member-row.tsx               # 4. Строка участника (аватар + имя + роль + статус)
│       ├── workspace-member-name.tsx              # 5. Имя + должность участника
│       ├── workspace-member-role-badge.tsx        # 6. Бейдж роли
│       ├── workspace-member-status-badge.tsx      # 7. Бейдж статуса (active/suspended)
│       ├── workspace-member-actions.tsx           # 8. Меню действий (изменить роль, заблокировать, удалить)
│       ├── workspace-invitations-section.tsx      # 9. Секция приглашений
│       ├── workspace-invitations-table.tsx        # 10. Таблица приглашений
│       ├── workspace-invitation-row.tsx           # 11. Строка приглашения (email + роль + статус + срок)
│       ├── workspace-invitation-status-badge.tsx  # 12. Бейдж статуса (pending/expired)
│       ├── invite-member-dialog.tsx               # 13. Диалог приглашения (email + роль + сообщение)
│       ├── workspace-domains-section.tsx          # 14. Секция разрешённых доменов
│       ├── workspace-domain-row.tsx               # 15. Строка домена
│       └── add-domain-dialog.tsx                  # 16. Диалог добавления домена
├── hooks/
│   ├── use-workspace-members.ts                   # Хук списка участников
│   ├── use-workspace-invitations.ts               # Хук списка приглашений
│   └── use-workspace-domains.ts                   # Хук списка доменов
└── validators/
    └── workspace-settings.ts                      # Zod-схемы (email, domain, invitation)
```

**Планируемый поток данных:**

```
page.tsx → <WorkspaceSettingsView />
  ├─→ Таб «Участники» → WorkspaceMembersSection
  │     ├─→ useWorkspaceMembers()          ← GET /api/team/members
  │     └─→ WorkspaceMembersTable → MemberRow (×N)
  │           ├─→ MemberName (аватар + имя + должность)
  │           ├─→ RoleBadge (роль)
  │           ├─→ StatusBadge (active/suspended)
  │           └─→ MemberActions (изменить роль, заблокировать, удалить)
  │
  ├─→ Таб «Приглашения» → WorkspaceInvitationsSection
  │     ├─→ useWorkspaceInvitations()      ← GET /api/workspace/invitations
  │     ├─→ InviteMemberDialog             ← POST /api/workspace/invitations
  │     └─→ InvitationsTable → InvitationRow (×N)
  │
  └─→ Таб «Домены» → WorkspaceDomainsSection
        ├─→ useWorkspaceDomains()          ← GET /api/workspace/domains
        ├─→ AddDomainDialog                ← POST /api/workspace/domains
        └─→ DomainsTable → DomainRow (×N)
```

## Tenant boundary

- `workspace_members.owner_id` — идентификатор workspace (владелец). Все участники
  с одинаковым `owner_id` принадлежат одному workspace.
- `workspace_invitations.owner_id` — приглашения привязаны к workspace владельца.
- `workspace_allowed_domains.owner_id` — доменные ограничения per-workspace.
- RLS-политики фильтруют все три таблицы по `owner_id` (владелец видит всех,
  участники — только подтверждённых members).

**Архитектурное решение:** workspace идентифицируется по `owner_id` (владельцу),
а не по отдельной таблице `workspaces`. Это упрощает схему (нет таблицы workspaces),
но усложняет передачу владения (требуется миграция всех записей на нового owner'а).

**Передача владения:** реализована через RPC-функцию `transfer_workspace_ownership`
(миграция 008). SECURITY DEFINER, требуется `team.manage`.

## Текущие ограничения

- **Frontend полностью отсутствует.** Нет ни одного компонента workspace-settings.
  Страница `/team` — заглушка с inline-вёрсткой.
- **API приглашений не реализован.** Таблица `workspace_invitations` существует, но
  нет эндпоинтов для создания/отправки/принятия приглашений.
- **API доменов не реализован.** Таблица `workspace_allowed_domains` существует,
  но нет эндпоинтов для управления доменами.
- **Нет email-сервиса** для отправки приглашений (требуется интеграция с
  почтовым провайдером или Supabase Edge Functions).
- **Нет страницы приглашения** (публичный маршрут для принятия приглашения
  по токену — требуется `/invite/:token` или аналогичный).
- **Типы не полны.** `WorkspaceMember`, `WorkspaceInvitation`, `WorkspaceAllowedDomain`
  не типизированы в `types/`.
- **Дублирование данных.** `workspace_members` и `user_roles` хранят похожую
  информацию (роли пользователей). Неясно, какая таблица каноническая.
- **Нет истории изменений** состава команды (только `assigned_by` и `created_at`).
- **Нет уведомлений** при добавлении/удалении из workspace.
- **Миграции workspace_members** созданы в ранних миграциях (002–008), но таблица
  может не полностью соответствовать текущей схеме.
