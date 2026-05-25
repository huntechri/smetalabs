# Архитектура бэкенда SmetaLab

> 2026-05-22 · Next.js 16 (App Router) · Supabase (PostgreSQL) · TypeScript

---

## 1. Схема базы данных

Все таблицы (описанные через Drizzle ORM) находятся в схеме `public`, RLS включён на всех. Схема и миграции управляются через Drizzle ORM/Kit и хранятся локально в репозитории в каталоге `db/migrations/`.

### 1.1 Ядро (RBAC и workspace)

**profiles** — профили пользователей (3 записи)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | FK → `auth.users.id` |
| `full_name` | text | nullable |
| `avatar_url` | text | nullable |
| `workspace_name` | text | nullable |
| `workspace_logo` | text | nullable |
| `phone` | text | nullable |
| `position` | text | nullable |
| `created_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | `now()` |

**roles** — определения ролей (5 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `name` | text UNIQUE | `owner`, `admin`, `manager`, `estimator`, `viewer` |
| `label` | text | Человекочитаемое название |
| `locked` | bool | `false` — нельзя удалить locked-роль |
| `description` | text | nullable |
| `created_at` | timestamptz | `now()` |

**permissions** — определения прав (19 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `key` | text UNIQUE | `billing.read`, `estimates.create`, `team.manage`… |
| `label` | text | Человекочитаемое название |
| `group_name` | text | `billing`, `estimates`, `projects`, `purchases`, `team` |
| `description` | text | nullable |
| `created_at` | timestamptz | `now()` |

**role_permissions** — связи роль→право (61 запись)

| Колонка | Тип | Примечание |
|---|---|---|
| `role_id` | uuid PK | FK → `roles.id` |
| `permission_id` | uuid PK | FK → `permissions.id` |

**user_roles** — связи пользователь→роль (1 запись)

| Колонка | Тип | Примечание |
|---|---|---|
| `user_id` | uuid PK | FK → `profiles.id` |
| `role_id` | uuid PK | FK → `roles.id` |
| `assigned_by` | uuid | FK → `profiles.id`, nullable |
| `created_at` | timestamptz | `now()` |

**user_settings** — настройки пользователя, JSONB-корзина (3 записи)

| Колонка | Тип | Примечание |
|---|---|---|
| `user_id` | uuid PK | FK → `profiles.id` |
| `profile` | jsonb | `'{}'` |
| `workspace` | jsonb | `'{}'` |
| `preferences` | jsonb | `'{}'` |
| `notifications` | jsonb | `'{}'` |
| `security` | jsonb | `'{}'` |
| `created_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | `now()` |

**workspace_members** — участники workspace (3 записи)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `user_id` | uuid | FK → `profiles.id` |
| `owner_id` | uuid | FK → `profiles.id` (владелец workspace) |
| `role_id` | uuid | FK → `roles.id` |
| `status` | enum | `active`, `invited`, `suspended` |
| `joined_at` | timestamptz | nullable |
| `last_active_at` | timestamptz | nullable |
| `created_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | `now()` |

**workspace_invitations** — приглашения (0 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `email` | text | Email приглашаемого |
| `role_id` | uuid | FK → `roles.id` |
| `invited_by` | uuid | FK → `profiles.id` |
| `owner_id` | uuid | FK → `profiles.id` |
| `message` | text | nullable |
| `invited_at` | timestamptz | `now()` |
| `expires_at` | timestamptz | |
| `status` | enum | `pending`, `expired` |
| `created_at` | timestamptz | `now()` |

**workspace_allowed_domains** — разрешённые домены (0 записей)

| Колонка | Тип |
|---|---|
| `id` | uuid PK |
| `domain` | text |
| `owner_id` | uuid FK → `profiles.id` |
| `added_by` | uuid FK → `profiles.id` |
| `added_at` | timestamptz |
| `created_at` | timestamptz |

---

### 1.2 Справочники

**directory_works** — каталог работ (723 записи)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `workspace_owner_id` | uuid | FK → `profiles.id` |
| `title` | text | NOT NULL, trimmed |
| `normalized_title` | text | Для дедупликации |
| `unit_code` | text | Код единицы измерения |
| `unit_label` | text | Метка единицы измерения |
| `rate_amount` | numeric | ≥ 0 |
| `currency_code` | varchar(3) | `'RUB'`, regex `^[A-Z]{3}$` |
| `price_kind` | enum | `base`, `labor`, `turnkey`, `estimate`, `custom` |
| `category` | text | NOT NULL |
| `subcategory` | text | nullable |
| `code` | text | nullable (код по классификатору) |
| `description` | text | nullable |
| `included_operations` | text | nullable |
| `excluded_operations` | text | nullable |
| `source_name` | text | nullable |
| `source_external_row_key` | text | nullable |
| `dedupe_fingerprint` | text | |
| `search_text` | text | Для полнотекстового поиска |
| `search_fts` | tsvector | Полнотекстовый индекс |
| `status` | enum | `active`, `archived` |
| `version` | int | ≥ 1, default `1` |
| `sort_order` | numeric | `0` |
| `created_by` / `updated_by` | uuid | FK → `profiles.id` |
| `created_at` / `updated_at` | timestamptz | |
| `archived_at` / `deleted_at` | timestamptz | nullable (soft delete) |

**directory_materials** — каталог материалов (35 226 записей)

Аналогичная структура + поля:
- `name` / `normalized_name` (вместо title)
- `supplier_name` / `supplier_id` (nullable)
- `image_url` (nullable)
- `aliases` — `text[]`, default `'{}'`
- `keywords` — `text[]`, default `'{}'`

**directory_suppliers** — поставщики (2 записи)

| Ключевые поля | Тип |
|---|---|
| `name` / `normalized_name` | text NOT NULL |
| `legal_status` | enum: `juridical`, `individual` |
| `color` | text, regex `^#[0-9A-Fa-f]{6}$`, default `'#64748B'` |
| `inn` / `phone` / `email` / `address` / `notes` | text, nullable |
| `status` | enum: `active`, `archived` |

**directory_counterparties** — контрагенты (1 запись)

| Ключевые поля | Тип |
|---|---|
| `name` / `normalized_name` | text NOT NULL |
| `type` | enum: `customer`, `contractor` |
| `legal_status` | enum: `juridical`, `individual` |
| `inn` / `phone` | text nullable |
| `legal_address` | text nullable |
| `bank_name` / `bik` / `corr_account` / `account_number` | text nullable (реквизиты юрлица) |
| `passport_series` / `passport_number` / `passport_issued_by` / `passport_issue_date` / `passport_department_code` / `registration_address` | text nullable (паспорт физлица) |

---

### 1.3 Бизнес-логика

**projects** — проекты (3 записи)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | |
| `workspace_owner_id` | uuid | FK → `profiles.id` |
| `title` / `normalized_title` | text | NOT NULL |
| `customer_name` | text | nullable |
| `address` | text | nullable |
| `budget_amount` | numeric | nullable, ≥ 0 |
| `start_date` / `end_date` | text | nullable |
| `status` | enum | `new`, `in_progress`, `completed` |
| `progress` | int | 0–100 |
| `customer_counterparty_id` | uuid | FK → `directory_counterparties.id`, nullable |
| `search_text` | text | |
| `created_by` / `updated_by` | uuid FK | |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | |

**project_estimate_records** — сметы (3 записи)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | |
| `workspace_owner_id` | uuid FK | |
| `project_id` | uuid FK | FK → `projects.id` |
| `name` / `normalized_name` | text | NOT NULL |
| `type` | text | default `'Основная'` |
| `status` | enum | `new`, `in_progress`, `completed` |
| `amount` | numeric | ≥ 0, default `0` |
| `works_coefficient_percent` | numeric | 0–1000, default `0` |
| `created_by` / `updated_by` | uuid FK | |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | |

**project_estimate_sections** — разделы сметы (11 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | |
| `workspace_owner_id` / `project_id` / `estimate_record_id` | uuid FK | |
| `title` / `number` | text | NOT NULL |
| `sort_order` | int | `0` |
| `works_amount` / `materials_amount` / `total_amount` | numeric | `0` |
| `created_by` / `updated_by` | uuid FK | |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | |

**project_estimate_works** — работы в смете (36 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | |
| `workspace_owner_id` / `project_id` / `estimate_record_id` / `section_id` | uuid FK | |
| `directory_work_id` | uuid FK | FK → `directory_works.id`, nullable |
| `directory_work_version` | int | nullable |
| `number` / `code` / `title` | text | |
| `unit_code` / `unit_label` | text | |
| `quantity` / `price` / `total_amount` | numeric | ≥ 0 |
| `base_price` | numeric | ≥ 0, `0` |
| `category` / `notes` | text | nullable |
| `sort_order` | int | `0` |
| `created_by` / `updated_by` | uuid FK | |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | |

**project_estimate_materials** — материалы в смете (39 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | |
| `workspace_owner_id` / `project_id` / `estimate_record_id` / `section_id` / `work_id` | uuid FK | |
| `directory_material_id` / `directory_material_version` | uuid/int | nullable |
| `number` / `code` / `title` | text | |
| `unit_code` / `unit_label` | text | |
| `quantity` / `price` / `total_amount` | numeric | ≥ 0 |
| `consumption` | numeric | nullable, > 0 |
| `supplier_name` / `notes` | text | nullable |
| `sort_order` | int | `0` |
| `created_by` / `updated_by` | uuid FK | |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | |

**project_estimate_purchases** — фактические закупки по смете (0 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | |
| `workspace_owner_id` | uuid FK | FK → `profiles.id` ON DELETE CASCADE |
| `estimate_record_id` | uuid FK | FK → `project_estimate_records.id` ON DELETE CASCADE |
| `directory_material_id` | uuid FK | nullable, FK → `directory_materials.id` ON DELETE SET NULL |
| `estimate_material_id` | uuid FK | nullable, FK → `project_estimate_materials.id` ON DELETE SET NULL |
| `title` | text | NOT NULL |
| `unit` | text | NOT NULL |
| `quantity` / `price` / `total` | numeric | ≥ 0, default `0` |
| `supplier_name` | text | nullable |
| `purchase_date` | text | nullable |
| `notes` | text | nullable |
| `created_by` / `updated_by` | uuid FK | nullable, FK → `profiles.id` ON DELETE SET NULL |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | |

Индексы: `idx_pep_estimate(estimate_record_id, workspace_owner_id)`, `idx_pep_material(estimate_record_id, directory_material_id) WHERE directory_material_id IS NOT NULL`, `idx_pep_archived(workspace_owner_id, archived_at)`

**global_purchases** — сводные закупки (10 записей)

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | |
| `workspace_owner_id` | uuid FK | |
| `title` / `normalized_title` | text | NOT NULL |
| `unit` | text | NOT NULL |
| `plan_quantity` / `plan_price` | numeric | ≥ 0 |
| `fact_quantity` / `fact_price` | numeric | nullable, ≥ 0 |
| `directory_material_id` | uuid FK | nullable, FK → `directory_materials.id` ON DELETE SET NULL |
| `supplier_id` / `supplier_name` | uuid/text | nullable |
| `project_id` / `project_title` | uuid/text | nullable |
| `purchase_date` | text | nullable |
| `status` | enum | `planned`, `ordered`, `partially_received`, `received`, `cancelled` |
| `notes` / `search_text` | text | nullable |
| `created_by` / `updated_by` | uuid FK | |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | |

Индекс: `idx_global_purchases_material(directory_material_id, workspace_owner_id) WHERE directory_material_id IS NOT NULL`

**notifications** — уведомления (0 записей)

| Колонка | Тип |
|---|---|
| `id` | uuid PK |
| `recipient_id` / `workspace_owner_id` / `actor_id` | uuid FK → `profiles.id` |
| `type` / `title` / `body` / `link` | text |
| `metadata` | jsonb |
| `read_at` / `archived_at` | timestamptz nullable |
| `created_at` / `updated_at` | timestamptz |

---

### 1.4 Вспомогательные таблицы (импорт и AI-search)

| Таблица | Назначение | Записей |
|---|---|---|
| `work_aliases` | Синонимы названий работ (для поиска) | 4 071 |
| `work_keywords` | Ключевые слова работ | 6 543 |
| `directory_work_import_jobs` | Задачи импорта работ | 1 |
| `directory_work_import_rows` | Строки импорта работ | 722 |
| `directory_work_embeddings` | Векторные эмбеддинги работ (pgvector) | 724 |
| `directory_material_embeddings` | Эмбеддинги материалов | 0 |
| `directory_material_import_jobs` | Задачи импорта материалов | 4 |
| `directory_material_import_rows` | Строки импорта материалов | 106 678 |

Все эти таблицы имеют `workspace_owner_id` (multi-tenant изоляция) и RLS enabled.

### 1.5 Общие паттерны схемы

- **Soft delete**: `archived_at` + `deleted_at` на большинстве бизнес-таблиц
- **Multi-tenant**: изоляция через `workspace_owner_id` (FK → `profiles.id`)
- **Аудит**: `created_by` / `updated_by` / `created_at` / `updated_at` на всех таблицах
- **Версионирование**: `version` (int, ≥ 1) на справочниках
- **Полнотекстовый поиск**: `search_text` + `search_fts` (tsvector)
- **Дедупликация**: `dedupe_fingerprint`, `normalized_title` / `normalized_name`
- **Все суммы**: constraint `≥ 0`
- **Все ID**: uuid, генерируются через `uuid_generate_v4()` или `gen_random_uuid()`

---

## 2. RLS-политики

RLS включён на всех 28 таблицах (`rls_enabled: true`). Политики определены миграциями Supabase (56 миграций, первая RLS — `002_rls_policies` от 2026-05-11).

Основной принцип изоляции:
- Пользователь видит только данные своего `workspace_owner_id`
- `workspace_owner_id` определяется через `profiles.id = auth.uid()`
- Владелец workspace имеет полный доступ к своим данным
- Участники workspace (`workspace_members`) имеют доступ согласно роли

Сервисные функции (RPC) используют `SECURITY DEFINER` для обхода RLS с серверной валидацией прав. Обнаружено 16 security-ворнингов (Supabase Advisor):
- 5 функций доступны `anon`-роли как `SECURITY DEFINER` (reorder_*, transfer_workspace_ownership)
- 10 функций доступны `authenticated` как `SECURITY DEFINER`
- 1 функция с мутабельным `search_path`

---

## 3. API-дизайн

### 3.1 API Routes (REST)

Два реализованных эндпоинта в `app/api/`:

#### `GET /api/team/roles`
Возвращает список ролей с permission-ами. Требует аутентификации.

**Ответ 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "admin",
      "label": "Администратор",
      "locked": false,
      "description": "...",
      "created_at": "...",
      "permissions": [
        { "id": "uuid", "key": "team.manage", "label": "...", "group_name": "team" }
      ]
    }
  ]
}
```

**Ошибки:** `401` (не авторизован), `500` (внутренняя)

#### `POST /api/team/roles`
Создание роли. Только для admin/owner.

**Body:** `{ name, label, description?, permission_ids? }`
**Ответ 201:** `{ data: { id, name, label } }`
**Ошибки:** `400` (нет name/label), `403` (нет прав), `409` (дубликат name)

#### `GET /api/team/members`
Список участников workspace с их ролями.

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
      "roles": [{ "id": "uuid", "name": "admin", "label": "...", "locked": false }]
    }
  ],
  "meta": { "total": 3 }
}
```

#### `POST /api/team/members`
Назначение роли пользователю. Только admin/owner.

**Body:** `{ user_id, role_id }`
**Ответ 201:** `{ data: { user_id, role_id } }`
**Ошибки:** `400`, `403`, `404` (пользователь или роль не найдены), `409` (уже назначено)

#### `DELETE /api/team/members?user_id=...&role_id=...`
Снятие роли. Только admin/owner. Нельзя снять locked-роль.

**Ответ 200:** `{ data: { removed: true } }`
**Ошибки:** `400`, `403` (нет прав или роль locked)

### 3.2 База данных как API (Supabase REST + RPC)

Основной паттерн: клиентские компоненты обращаются к Supabase через JavaScript SDK (прямые запросы к таблицам), серверные мутации — через Postgres-функции (RPC), вызываемые из Server Actions.

**Основные RPC-функции (из migrations 039a–039f и далее):**
- `create_estimate_section` — создать раздел сметы
- `add_work_from_directory_to_estimate` — добавить работу из справочника
- `add_material_from_directory_to_estimate` — добавить материал из справочника
- `archive_estimate_section` / `archive_estimate_work` / `archive_estimate_material` — soft-delete
- `reorder_estimate_sections` / `reorder_estimate_works` / `reorder_estimate_materials` — drag-and-drop
- `recalculate_materials_by_work_quantity` — пересчёт материалов при изменении количества работы
- `transfer_workspace_ownership` — передача владения workspace
- `search_directory_materials_ai` — AI-поиск по материалам (pgvector)
- `update_directory_work` (RPC) — обновление работы с проверкой дубликатов
- `get_estimate_purchases(p_estimate_record_id, p_workspace_owner_id)` — план-факт анализ закупок по смете (вкладка «Закупки»), возвращает агрегированные данные из `project_estimate_materials` (план), а также `project_estimate_purchases` и `global_purchases` (факт) с расчётом отклонений и средневзвешенной цены
- `add_project_estimate_purchase(p_estimate_record_id, p_workspace_owner_id, ...)` — добавить фактическую закупку в смету
- `update_project_estimate_purchase(p_purchase_id, p_workspace_owner_id, ...)` — обновить запись закупки (кол-во, цена, поставщик, дата, заметки)
- `archive_project_estimate_purchase(p_purchase_id, p_workspace_owner_id, p_updated_by)` — архивировать запись закупки (soft delete)

**Прямые запросы к таблицам (из кода):**
- `supabase.from('roles').select('*')` — список ролей
- `supabase.from('user_roles').select('..., roles!inner(...)')` — роли пользователя
- `supabase.from('role_permissions').select('..., permissions!inner(...)')` — права роли
- `supabase.from('profiles').select('*')` — профили

### 3.3 Принципы API

- **Чтение**: прямые запросы через Supabase SDK (RLS фильтрует)
- **Мутации**: через RPC-функции (`SECURITY DEFINER`) — атомарные операции с серверной валидацией
- **Аутентификация**: Supabase Auth (JWT в куках), проверка `auth.uid()` на всех эндпоинтах
- **Авторизация**: RBAC через `user_roles` → `role_permissions` → `permissions`
- **Формат ошибок**: `{ error: { code: string, message: string } }`

---

## 4. Валидация (Zod)

Схемы Zod — в `lib/validators/team.ts`:

```typescript
AssignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
})

CreateRoleSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z_]+$/),
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permission_ids: z.array(z.string().uuid()).optional(),
})

RemoveRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
})
```

---

## 5. Аутентификация и Middleware

### 5.1 Supabase Auth
- Серверный клиент: `lib/supabase/server.ts` — `createServerClient` из `@supabase/ssr`, читает куки
- Браузерный клиент: `lib/supabase/client.ts` — `createBrowserClient`, использует `NEXT_PUBLIC_*` переменные
- Админ-клиент: `lib/supabase/admin.ts` — `SERVICE_ROLE_KEY`, только сервер

### 5.2 Middleware (`middleware.ts`)
- Обновляет сессию при каждом запросе
- Защищённые маршруты (все кроме `/auth`, `/api`, `/_next`, `/`): редирект на `/auth/login?redirect=...` если нет сессии
- Matcher: все пути кроме статики

### 5.3 RBAC-хелперы (`lib/auth/permissions.ts`)
```typescript
getUserRoles(): Promise<RoleName[]>          // роли текущего пользователя
getUserPermissions(): Promise<PermissionKey[]> // права (раскрытые из ролей)
hasPermission(key): Promise<boolean>         // проверка конкретного права
canManageTeam(): Promise<boolean>            // право team.manage
canManageProjects(): Promise<boolean>        // любое projects.*
canManageEstimates(): Promise<boolean>       // любое estimates.*
requirePermission(key): Promise<void>        // бросить если нет права
```

### 5.4 Матрица ролей (`types/roles.ts`)

| Право | owner | admin | manager | estimator | viewer |
|---|---|---|---|---|---|
| `billing.read` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `billing.manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `estimates.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `estimates.create/update/delete` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `projects.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `projects.create/update/delete` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `purchases.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `purchases.create/update/delete` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `team.read` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `team.create/update/delete/manage` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 6. Переменные окружения

Из `.env.local` (локальная разработка):

| Переменная | Назначение |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase-проекта |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Публичный анонимный ключ (JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | Сервисный ключ (только сервер, минует RLS) |
| `NEXT_PUBLIC_APP_URL` | URL приложения (для редиректов) |

`NEXT_PUBLIC_*` переменные доступны на клиенте, `SUPABASE_SERVICE_ROLE_KEY` — только на сервере.

---

## 7. Утилиты серверного слоя

### `lib/formatters.ts`
- `formatMoney(value: number)` — сумма в ₽ с разрядами (ru-RU)
- `formatConsumption(value: number)` — расход с 3 знаками после запятой
- `parseDecimalInput(value: string)` — строка → число (запятая → точка)
- `formatDate(date: Date)` — дата в формате `ДД.ММ.ГГГГ`

### `lib/calculations.ts`
- `getTotal(quantity, price)` → `quantity * price`

### `lib/utils.ts`
- `cn(...inputs)` — мёрдж Tailwind-классов (clsx + tailwind-merge)

---

## 8. Миграции

Локальные SQL-миграции генерируются через Drizzle Kit и хранятся в репозитории в каталоге `db/migrations/`. Всего определено 49 миграций (от `002_rls_policies` до `049_project_estimate_purchases_rpc`). Основные этапы:

| Диапазон | Содержание |
|---|---|
| 002–009 | RLS, auth, workspace, приглашения, передача владения |
| 010–019 | Справочник работ: foundation, read API, AI search, performance, импорт |
| 020–025 | Справочники: материалы, поставщики, контрагенты |
| 026–031 | Проекты, сводные закупки |
| 033–041 | Сметы: записи, секции, работы, материалы, drag-and-drop, RPC, дубликаты |
| 042–044 | Уведомления, коэффициенты, ceil, расчёты, фиксы сметного редактора |
| 045–046 | `directory_material_id` в `global_purchases`, RPC `get_estimate_purchases` v1 |
| 047–049 | `project_estimate_purchases` foundation, RPC `get_estimate_purchases` v2 (fact → `project_estimate_purchases`), CRUD RPCs |
| 050 | Обновление RPC `get_estimate_purchases` v3 (объединение `project_estimate_purchases` и `global_purchases` для внеплановых закупок) |
