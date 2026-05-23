# Архитектура SmetaLab

> 2026-05-22 | production
>
> Корневой архитектурный документ. Описывает стек, слои, маршрутизацию, аутентификацию, RBAC и структуру данных.

---

## Стек технологий

| Категория | Технология | Версия | Назначение |
|---|---|---|---|
| Фреймворк | Next.js (App Router) | 16.1.7 | SSR, маршрутизация, Server Actions |
| Язык | TypeScript | 5.9.3 | Типизация |
| Аутентификация | Supabase Auth (`@supabase/ssr`) | 0.10.3 | Сессии, OAuth, куки-мидлвара |
| База данных | PostgreSQL (Supabase) | 17.6 | Хранилище |
| Клиент БД | `@supabase/supabase-js` | 2.105.4 | Прямые запросы к БД (без ORM) |
| UI-компоненты | shadcn/ui (radix-mira) | 4.7.0 | Примитивы дизайн-системы |
| Стили | Tailwind CSS | 4.2.1 | Utility-first CSS |
| Таблицы | `@tanstack/react-table` | 8.21.3 | Headless-таблицы |
| Графики | Recharts | 3.8.0 | Интерактивные графики |
| Drag & Drop | `@dnd-kit` | 6.3.1 | Сортировка и перетаскивание |
| Валидация | Zod | 4.4.3 | Схемы валидации форм и API |
| Пакетный менеджер | pnpm | — | Управление зависимостями |

**Что НЕ используется:**
- ❌ Drizzle ORM — запросы напрямую через `@supabase/supabase-js`
- ❌ TanStack Query — нет React Query слоя
- ❌ Prisma — не используется

---

## Слоевая модель

```
app/           ─ Роутинг App Router, page.tsx (композиция), layout.tsx (общий UI)
  │
  ├─ features/ ─ Бизнес-фичи: компоненты, хуки, моки, поддомены
  │
  ├─ components/ui/ ─ shadcn/ui примитивы (НЕ ТРОГАТЬ без веской причины)
  │
  ├─ components/     ─ Инфраструктурные компоненты уровня приложения
  │
  ├─ hooks/          ─ Общие React-хуки (use-mobile)
  │
  ├─ lib/            ─ Чистые утилиты (без React), валидаторы, Supabase-клиенты
  │
  ├─ types/          ─ Общие TypeScript-типы и интерфейсы
  │
  └─ middleware.ts   ─ Next.js middleware (аутентификация через Supabase)
```

**Правило зависимости:** `app/` → `features/` → `lib/` + `types/` + `hooks/`. Нижние слои не импортируют верхние.

---

## Структура feature-модуля

Каждый бизнес-домен — папка в `features/`. Структура (на примере `purchases`):

```
features/purchases/
├── __mocks__/                         # Тестовые данные (этап вёрстки, удаляются с БД)
│   └── purchases.ts
├── components/                        # UI верхнего уровня (обёртки, view-компоненты)
│   └── purchases-view.tsx
├── hooks/                             # Хуки фичи (useState, useMemo)
│   └── use-purchases.ts
├── purchase-details/                  # Поддомен (если фича большая)
│   └── components/
│       ├── purchase-section.tsx       # Композиция: хук → map → Row
│       ├── purchase-row.tsx           # Строка: имя + метрики
│       ├── purchase-name.tsx          # Атомарный UI: название
│       ├── purchase-value.tsx         # Атомарный UI: бейдж
│       └── purchase-metric-group.tsx  # Атомарный UI: группа метрик
```

**Правила:**
- **Один компонент = один файл**, именованный экспорт
- Компоненты — только JSX + пропсы, без бизнес-логики
- Хуки — на своём уровне, отдельно от компонентов
- Моки — временные, удаляются с появлением БД

### Существующие фичи (2026-05-22)

| Фича | Директория | Поддомены | Статус |
|---|---|---|---|
| Аутентификация | `features/auth/` | `components/` | ✅ |
| Дашборд | `features/dashboard/` | — | ✅ |
| Проекты | `features/projects/` | `components/` | ✅ |
| Сметы | `features/estimates/` | `estimate-details/`, `estimate-tabs/` | ✅ |
| Закупки | `features/purchases/` | `purchase-details/` | ✅ |
| Выполнение | `features/execution/` | `execution-details/` | ✅ |
| Глобальные закупки | `features/global-purchases/` | `global-purchases-details/` | ✅ |
| Справочник материалов | `features/directory-materials/` | `directory-materials-details/` | ✅ |
| Справочник работ | `features/directory-works/` | `directory-works-details/` | ✅ |
| Справочник поставщиков | `features/directory-suppliers/` | `directory-suppliers-details/` | ✅ |
| Справочник контрагентов | `features/directory-counterparties/` | `directory-counterparties-details/` | ✅ |
| Справочники (общее) | `features/directories/` | `components/` | ✅ |

---

## Маршрутизация

### App Router (Next.js 16)

Используются Route Groups для разделения зон с разными layout'ами:

| Route Group | Назначение | Layout |
|---|---|---|
| `(auth)/` | Авторизация, без sidebar | Центрирование формы |
| `(main)/` | Основной интерфейс | Sidebar + Header |
| `/admin` | Админ-панель | Отдельный layout (без группы) |
| `/api` | API-роуты | Без layout |

### Дерево маршрутов

```
app/
├── layout.tsx                              # Корневой layout (шрифты, ThemeProvider)
├── page.tsx                                # Редирект на /dashboard
│
├── (auth)/                                 # Route Group: авторизация
│   ├── layout.tsx                          # Центрирование (без sidebar)
│   ├── login/page.tsx                      # /login
│   ├── singup/page.tsx                     # /singup
│   └── forgot-password/page.tsx            # /forgot-password
│
├── (main)/                                 # Route Group: основной интерфейс
│   ├── layout.tsx                          # SidebarProvider + AppSidebar + SiteHeader
│   ├── dashboard/page.tsx                  # /dashboard
│   ├── projects/                           # Проекты
│   │   ├── page.tsx                        # /projects — список
│   │   └── [projectId]/                    # /projects/:id
│   │       ├── page.tsx                    # Детали проекта
│   │       └── estimates/
│   │           └── [estimateId]/           # /projects/:id/estimates/:eid
│   │               ├── layout.tsx          # Табы навигации + тулбар
│   │               ├── page.tsx            # Вкладка «Состав»
│   │               ├── documents/page.tsx  # Вкладка «Документы»
│   │               ├── execution/page.tsx  # Вкладка «Выполнение»
│   │               ├── finances/page.tsx   # Вкладка «Финансы»
│   │               └── purchases/page.tsx  # Вкладка «Закупки»
│   ├── directories/                        # Справочники
│   │   ├── counterparties/page.tsx         # /directories/counterparties
│   │   ├── materials/page.tsx              # /directories/materials
│   │   ├── suppliers/page.tsx              # /directories/suppliers
│   │   └── works/page.tsx                  # /directories/works
│   ├── procurements/page.tsx               # /procurements — глобальные закупки
│   ├── team/page.tsx                       # /team — команда
│   └── templates/                          # Шаблоны смет
│       ├── page.tsx                        # /templates — список
│       └── [templateId]/page.tsx           # /templates/:id
│
├── admin/page.tsx                          # /admin
│
└── api/                                    # REST API (внешние потребители)
    └── team/
        ├── members/route.ts                # GET/POST/DELETE /api/team/members
        └── roles/route.ts                  # GET/POST /api/team/roles
```

### Динамические маршруты

| URL | Файл |
|---|---|
| `/projects` | `(main)/projects/page.tsx` |
| `/projects/42` | `(main)/projects/[projectId]/page.tsx` |
| `/projects/42/estimates/7` | `(main)/projects/[projectId]/estimates/[estimateId]/page.tsx` |

---

## Аутентификация

### Поток аутентификации

```
Пользователь входит через login-form.tsx
  │
  ├─ supabase.auth.signInWithPassword()
  │
  ├─ Supabase устанавливает сессионные куки (sb-*-auth-token)
  │
  ├─ middleware.ts перехватывает каждый запрос:
  │   ├─ createServerClient с куками из request
  │   ├─ supabase.auth.getUser() — проверка сессии
  │   ├─ Публичные пути (/auth, /api, /_next, /favicon.ico) — без проверки
  │   ├─ Защищённые пути — если нет user → редирект на /auth/login
  │   └─ Авто-рефреш сессии (если истекла)
  │
  └─ При выходе: supabase.auth.signOut() → удаление кук
```

### Ключевые файлы аутентификации

| Файл | Назначение |
|---|---|
| `middleware.ts` | Guardian всех запросов: проверка сессии, защита роутов |
| `lib/supabase/server.ts` | Серверный клиент (Server Components, Route Handlers) — читает куки |
| `lib/supabase/client.ts` | Браузерный клиент (Client Components) — `createBrowserClient` |
| `lib/supabase/admin.ts` | Админ-клиент (service_role key, ТОЛЬКО сервер) |
| `lib/supabase/middleware.ts` | Реэкспорт `createClient` из `server.ts` |

### Supabase клиенты

```typescript
// lib/supabase/server.ts — для Server Components / Route Handlers
export async function createClient()         // ← анонимный ключ + куки

// lib/supabase/client.ts — для Client Components ("use client")
export function createClient()               // ← анонимный ключ (env NEXT_PUBLIC_)

// lib/supabase/admin.ts — для seed-скриптов и админ-операций
export function createAdminClient()          // ← service_role key (НЕ В БРАУЗЕР)
```

**Важно:** callback/confirm/verify маршруты (`/auth/callback`) в коде отсутствуют. Регистрация/вход — исключительно через `@supabase/ssr` с куки-мидлварой (password-based auth).

### Защищённые роуты (middleware.ts)

```typescript
// Все пути по умолчанию защищены, кроме:
const publicPaths = ['/auth', '/api', '/_next', '/favicon.ico']
const isLanding = pathname === '/'
```

Любой непубличный путь без активной сессии → `302 Redirect → /auth/login?redirect=<original>`.

---

## RBAC (Role-Based Access Control)

### Модель

```
roles                    permissions              role_permissions
┌──────────┐            ┌──────────────────┐     ┌─────────────────┐
│ id (PK)  │            │ id (PK)          │     │ role_id (FK)    │
│ name ◄───┼────────────┼── key (UNIQUE)   │─────┼── permission_id │
│ label    │            │ label            │     └─────────────────┘
│ locked   │            │ group_name       │
│ desc     │            │ desc             │     user_roles
└──────────┘            └──────────────────┘     ┌─────────────────┐
                                                 │ user_id (FK)    │
┌──────────────────┐                             │ role_id (FK)    │
│ profiles (auth)  │                             │ assigned_by     │
│ id ← auth.users  │─────────────────────────────│ created_at      │
└──────────────────┘                             └─────────────────┘
```

### Роли (5 предустановленных, поле `locked`)

| Роль | locked | Описание |
|---|---|---|
| `owner` | true | Владелец workspace, все права |
| `admin` | true | Администратор, все кроме billing.manage |
| `manager` | true | Менеджер: CRUD смет/проектов/закупок, чтение команды |
| `estimator` | false | Сметчик: CRUD смет, чтение проектов/закупок |
| `viewer` | false | Наблюдатель: только чтение |

### Права (PermissionKey, 19 штук)

| Группа | Ключи |
|---|---|
| `billing` | `billing.read`, `billing.manage` |
| `estimates` | `estimates.read`, `estimates.create`, `estimates.update`, `estimates.delete` |
| `projects` | `projects.read`, `projects.create`, `projects.update`, `projects.delete` |
| `purchases` | `purchases.read`, `purchases.create`, `purchases.update`, `purchases.delete` |
| `team` | `team.read`, `team.create`, `team.update`, `team.delete`, `team.manage` |

### Матрица (ROLE_PERMISSION_MATRIX в types/roles.ts)

```typescript
owner:    [...все 19 прав, включая billing.manage]
admin:    [...все 18 прав, кроме billing.manage]
manager:  [estimates.*, projects.*, purchases.*, team.read]
estimator: [estimates.*, projects.read, purchases.read]
viewer:   [billing.read, estimates.read, projects.read, purchases.read, team.read]
```

### Проверка прав (lib/auth/permissions.ts)

```typescript
// Основные функции
getUserRoles(): Promise<RoleName[]>              // Роли текущего пользователя
getUserPermissions(): Promise<PermissionKey[]>   // Развёрнутые из ролей права
hasPermission(key): Promise<boolean>              // Одно право
hasAnyPermission(keys): Promise<boolean>          // Хотя бы одно
hasAllPermissions(keys): Promise<boolean>         // Все права
requirePermission(key): Promise<void>             // Guard (throws)
requireAnyPermission(keys): Promise<void>         // Guard (throws)

// Семантические хелперы
canManageProjects(): Promise<boolean>
canManageEstimates(): Promise<boolean>
canManageTeam(): Promise<boolean>
canViewBilling(): Promise<boolean>
isAuthenticated(): Promise<boolean>
requireAuth(): Promise<void>
```

### Использование в API (пример)

```typescript
// app/api/team/members/route.ts
export async function POST(request: Request) {
  const canManage = await canManageTeam()
  if (!canManage) {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
  }
  // ...
}
```

---

## Работа с данными

### Прямой доступ к Supabase (без ORM)

Проект использует `@supabase/supabase-js` напрямую: запросы строятся через `supabase.from('table').select(...).eq(...)`.

**Нет** слоя Drizzle ORM, Prisma или абстрактного `lib/db/queries/`. Запросы к БД выполняются в Route Handlers через `createClient()` из `lib/supabase/server`.

### API Routes (текущие)

```
app/api/
└── team/
    ├── members/route.ts    # GET (список участников), POST (назначить роль), DELETE (снять роль)
    └── roles/route.ts      # GET (список ролей с правами), POST (создать роль)
```

### Валидация (Zod)

`lib/validators/team.ts` — схемы для операций с ролями:

```typescript
AssignRoleSchema    // { user_id, role_id }
CreateRoleSchema    // { name, label, description?, permission_ids? }
RemoveRoleSchema    // { user_id, role_id }
```

### RLS (Row-Level Security)

Все таблицы в БД имеют `rls_enabled: true`. Политики определены в Supabase-миграциях (миграции 002, 004, 005, 006, 007, 008, 014). Доступ к данным ограничен через `workspace_owner_id` и ролевые проверки.

---

## Миграции БД (Supabase)

Миграции управляются через Supabase CLI. В репозитории нет локальной директории `db/migrations/` — миграции хранятся и применяются на стороне Supabase. Всего 57 миграций (от `002_rls_policies` до `049_fix_material_add_response_work_totals`).

### Основные группы миграций

| Группа | Диапазон версий | Содержание |
|---|---|---|
| Аутентификация и workspace | 002–008 | RLS, профили, приглашения, ownership |
| Справочник работ | 009–019a | Таблицы, импорт, AI-поиск, embeddings |
| Справочник материалов | 020–025 | Таблицы, импорт, AI-поиск |
| Справочник поставщиков | 019 (slug 019_directory_suppliers_foundation) | Таблицы |
| Справочник контрагентов | 024–025 | Таблицы, grants |
| Проекты | 026–028 | Таблицы, grants, связь с контрагентами |
| Глобальные закупки | 029–031 | Таблицы, индексы |
| Сметные записи | 033–038 | Estimate records, works, materials, коэффициенты |
| Операции со сметами | 039–041 | RPC для секций/работ/материалов, реордеринг |
| Уведомления | 042 | `notifications` таблица |
| Материалы смет | 042–049 | image_url, ceil, расчёты, фиксы |

### Таблицы БД (всего 24 в public-схеме)

**Ядро (аутентификация/workspace):**
`profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_settings`, `workspace_members`, `workspace_invitations`, `workspace_allowed_domains`

**Справочники:**
`directory_works`, `directory_materials`, `directory_suppliers`, `directory_counterparties`

**Вспомогательные справочников:**
`work_aliases`, `work_keywords`, `directory_work_import_jobs`, `directory_work_import_rows`, `directory_work_embeddings`, `directory_material_import_jobs`, `directory_material_import_rows`, `directory_material_embeddings`

**Бизнес-домен:**
`projects`, `global_purchases`, `project_estimate_records`, `project_estimate_sections`, `project_estimate_works`, `project_estimate_materials`, `notifications`

---

## Утилиты (lib/)

| Файл | Назначение |
|---|---|
| `utils.ts` | `cn()` — мёрдж Tailwind-классов (clsx + tailwind-merge) |
| `formatters.ts` | `formatMoney(value)` — форматирование валюты `
{:.highlight}
₽, разряды` |
| `calculations.ts` | `getTotal(quantity, price)` — умножение |
| `auth/permissions.ts` | Все функции проверки прав (11 экспортов) |
| `supabase/server.ts` | Серверный Supabase-клиент с куками |
| `supabase/client.ts` | Браузерный Supabase-клиент |
| `supabase/middleware.ts` | Реэкспорт `createClient` из `server.ts` |
| `supabase/admin.ts` | Админ-клиент с service_role ключом |
| `validators/team.ts` | Zod-схемы: AssignRole, CreateRole, RemoveRole |

---

## Компонентная модель

### Именование и экспорты

| Тип | Регистр | Экспорт | Пример |
|---|---|---|---|
| Feature-компонент | PascalCase | Именованный | `export function ProjectCard()` |
| Страница page.tsx | — | default | `export default function Page()` |
| Layout | — | default | `export default function MainLayout()` |
| Хук | camelCase/kebab-case | Именованный | `usePurchases`, `use-mobile` |
| Утилита | camelCase | Именованный | `formatMoney`, `getTotal` |
| Тип | PascalCase | Именованный | `PermissionKey`, `TeamMember` |

### Размещение компонентов

```
components/ui/          ← shadcn/ui (НЕ ТРОГАТЬ)
components/             ← Инфраструктурные: theme-provider.tsx
features/{domain}/      ← Бизнес-компоненты
```

### Поток данных в фиче (на примере purchases)

```
page.tsx
  └─→ <PurchasesView />
        └─→ <PurchaseSection />
              ├─→ usePurchases()        ← хук (состояние)
              └─→ <PurchaseRow /> (×N)
                    ├─→ <PurchaseName />
                    └─→ <PurchaseMetricGroup />
                          └─→ <PurchaseValue /> (×N)
```
