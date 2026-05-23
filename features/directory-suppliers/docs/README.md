# Справочник поставщиков (directory-suppliers)

> Статус: production | 2026-05-22

## Назначение

Управление справочником поставщиков — юридических и физических лиц, у которых закупаются
материалы и работы. Модуль предоставляет просмотр списка, поиск, создание, редактирование
и архивирование записей с полной интеграцией через API и TanStack Query.

**Маршрут:** `/directories/suppliers`
**Страница:** `app/(main)/directories/suppliers/page.tsx`

## Структура модуля

```
features/directory-suppliers/
├── api/
│   ├── directory-suppliers-client.ts       # TanStack Query-клиент (fetch, create, update, archive)
│   ├── directory-suppliers-query-keys.ts   # Ключи кэширования и теги инвалидации
│   └── directory-suppliers-errors.ts       # Ошибки API-клиента
├── components/
│   └── directory-suppliers-view.tsx        # Layout-обёртка со скроллом
├── directory-suppliers-details/
│   └── components/
│       ├── directory-suppliers-section.tsx      # "use client" — список поставщиков
│       ├── directory-suppliers-row.tsx          # Строка: имя + цвет + статус + ИНН + телефон
│       ├── directory-suppliers-name.tsx         # Отображение наименования
│       ├── directory-suppliers-value.tsx        # Бейдж «label: value»
│       ├── directory-suppliers-metric-group.tsx # Группа метрик с заголовком
│       └── directory-suppliers-create-dialog.tsx# Диалог создания (5 полей + Select цвета)
├── hooks/
│   └── use-directory-suppliers.ts          # TanStack Query: useQuery + useMutation (create/update/archive)
├── server/
│   ├── directory-suppliers.route-handlers.ts    # Обработчики API-роутов (list, detail, create, update, archive)
│   ├── directory-suppliers.schemas.ts           # Zod-схемы валидации
│   ├── directory-suppliers.service.ts           # Бизнес-логика
│   └── directory-suppliers.repository.ts        # Доступ к БД через Drizzle
└── types.ts                                # Типы модуля

app/api/directory-suppliers/
├── route.ts                               # GET (список), POST (создание)
└── [id]/route.ts                          # GET (детали), PATCH (обновление), DELETE (архивирование)

db/schema/
└── directory-suppliers.ts                 # Drizzle-схема таблицы directory_suppliers

features/directories/components/
└── suppliers-toolbar.tsx                  # Тулбар: поиск + кнопка «Добавить»
```

## Данные

### Тип TypeScript: `DirectorySupplier` (`types.ts`)

```typescript
export type DirectorySupplierStatus = "active" | "archived"
export type DirectorySupplierLegalStatus = "juridical" | "individual"
export type DirectorySuppliersSort = "relevance" | "updated_desc" | "name_asc"

export type DirectorySupplier = {
  id: string
  name: string
  normalizedName: string
  legalStatus: DirectorySupplierLegalStatus
  color: string
  inn: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  status: DirectorySupplierStatus
  version: number
  metadata: {
    createdAt: string
    updatedAt: string
  }
}
```

### `DirectorySuppliersListParams` (параметры запроса списка)

```typescript
export type DirectorySuppliersListParams = {
  q?: string            // Поисковый запрос
  status?: DirectorySupplierStatus  // "active" | "archived" (по умолчанию "active")
  limit?: number        // Размер страницы (по умолчанию 50)
  cursor?: number       // Смещение для пагинации (по умолчанию 0)
  sort?: DirectorySuppliersSort  // "relevance" | "updated_desc" | "name_asc"
}
```

### `DirectorySupplierMutationInput` (создание/обновление)

```typescript
export type DirectorySupplierMutationInput = {
  name: string                            // Обязательно
  legalStatus: DirectorySupplierLegalStatus  // Обязательно: "juridical" | "individual"
  color?: string | null                   // Hex-цвет (по умолчанию "#64748B")
  inn?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}
```

### `DirectorySuppliersListResponse` (ответ API)

```typescript
export type DirectorySuppliersListResponse = {
  data: DirectorySupplier[]
  meta: {
    limit: number
    cursor: number
    nextCursor: number | null
    hasMore: boolean
    total: number
  }
}
```

### Схема БД (`db/schema/directory-suppliers.ts`)

Таблица `directory_suppliers` с полной схемой Drizzle ORM:

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `uuid` | Первичный ключ (defaultRandom) |
| `workspaceOwnerId` | `uuid` → `profiles.id` | Tenant-изоляция (FK, cascade delete) |
| `name` | `text` (NOT NULL) | Наименование поставщика |
| `normalizedName` | `text` (NOT NULL) | Нормализованное имя для поиска |
| `legalStatus` | `enum` (NOT NULL) | `juridical` / `individual` |
| `color` | `text` (NOT NULL, default `#64748B`) | Hex-цвет |
| `inn` | `text` | ИНН |
| `phone` | `text` | Телефон |
| `email` | `text` | Email |
| `address` | `text` | Адрес |
| `notes` | `text` | Заметки |
| `status` | `enum` (NOT NULL, default `active`) | `active` / `archived` |
| `version` | `integer` (NOT NULL, default 1) | Оптимистичная блокировка |
| `createdBy` | `uuid` → `profiles.id` | Кто создал (restrict delete) |
| `updatedBy` | `uuid` → `profiles.id` | Кто обновил (set null) |
| `createdAt` | `timestamptz` (NOT NULL, default now) | Дата создания |
| `updatedAt` | `timestamptz` (NOT NULL, default now) | Дата обновления |
| `archivedAt` | `timestamptz` | Дата архивирования |
| `deletedAt` | `timestamptz` | Дата удаления (soft delete) |

**Индексы:**
- `uq_directory_suppliers_id_workspace` — уникальный (id, workspaceOwnerId)
- `uq_directory_suppliers_workspace_inn_active` — условный уникальный (workspaceOwnerId, inn) для активных записей
- `idx_directory_suppliers_workspace_status_deleted` — (workspaceOwnerId, status, deletedAt)
- `idx_directory_suppliers_workspace_normalized_name` — (workspaceOwnerId, normalizedName)
- `idx_directory_suppliers_workspace_updated_at` — (workspaceOwnerId, updatedAt)

**Ограничения (CHECK):**
- `name` не пустой
- `normalizedName` не пустой
- `version > 0`
- `color` соответствует hex-формату `#[0-9A-Fa-f]{6}`

## API

Все эндпоинты реализованы и работают в production.

### Эндпоинты

| Метод | Путь | Назначение |
|-------|------|-----------|
| `GET` | `/api/directory-suppliers` | Список поставщиков с пагинацией, поиском, сортировкой и фильтрацией по статусу |
| `POST` | `/api/directory-suppliers` | Создание нового поставщика |
| `GET` | `/api/directory-suppliers/[id]` | Детали одного поставщика |
| `PATCH` | `/api/directory-suppliers/[id]` | Обновление существующего поставщика |
| `DELETE` | `/api/directory-suppliers/[id]` | Soft-delete (архивирование — установка `archivedAt`) |

### Параметры GET-запроса списка

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `q` | `string` | — | Поиск по `normalizedName` |
| `status` | `"active"` \| `"archived"` | `"active"` | Фильтр по статусу |
| `limit` | `number` | `50` | Количество записей на странице |
| `cursor` | `number` | `0` | Смещение для курсорной пагинации |
| `sort` | `"relevance"` \| `"updated_desc"` \| `"name_asc"` | `"relevance"` | Сортировка |

### Валидация

Все входящие данные валидируются через Zod-схемы (`server/directory-suppliers.schemas.ts`):
- `parseDirectorySuppliersListParams` — параметры списка
- `parseDirectorySupplierId` — UUID идентификатора
- `parseDirectorySupplierMutationBody` — тело создания/обновления

### Формат ошибок

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Поставщик не найден"
  }
}
```

Коды ошибок: `BAD_REQUEST` (400), `NOT_FOUND` (404), `CONFLICT` (409), `INTERNAL_ERROR` (500).

## TanStack Query-интеграция

### Клиент (`api/directory-suppliers-client.ts`)

```typescript
fetchDirectorySuppliers(params)          // GET /api/directory-suppliers
fetchDirectorySupplier(id)               // GET /api/directory-suppliers/:id
createDirectorySupplier(input)           // POST /api/directory-suppliers
updateDirectorySupplier({ id, input })   // PATCH /api/directory-suppliers/:id
archiveDirectorySupplier(id)             // DELETE /api/directory-suppliers/:id
```

Все функции используют `fetch` с `credentials: "include"` — куки передаются автоматически,
авторизация через Supabase RLS на сервере.

Ошибки обрабатываются через `throwDirectorySuppliersApiError(response, resource)` —
при HTTP-ошибке парсится JSON-ответ и выбрасывается `DirectorySuppliersApiError`.

### Ключи кэширования (`api/directory-suppliers-query-keys.ts`)

```typescript
directorySuppliersQueryKeys.all          // ["directorySuppliers"]
directorySuppliersQueryKeys.lists()      // ["directorySuppliers", "list"]
directorySuppliersQueryKeys.list(params) // ["directorySuppliers", "list", params]
directorySuppliersQueryKeys.details()    // ["directorySuppliers", "detail"]
directorySuppliersQueryKeys.detail(id)   // ["directorySuppliers", "detail", id]
```

### Хук `useDirectorySuppliers()` (`hooks/use-directory-suppliers.ts`)

Хук полностью на TanStack Query. Читает параметры из URL (`useSearchParams`),
автоматически перезапрашивает данные при изменении фильтров.

**Возвращаемое значение:**

| Поле | Тип | Описание |
|------|-----|----------|
| `suppliers` | `DirectorySupplier[]` | Массив поставщиков |
| `meta` | `DirectorySuppliersListMeta \| null` | Метаданные пагинации |
| `params` | `DirectorySuppliersListParams` | Текущие параметры запроса |
| `loading` | `boolean` | Идёт первичная загрузка (`isLoading`) |
| `isFetching` | `boolean` | Идёт фоновое обновление (`isFetching`) |
| `error` | `string \| null` | Текст ошибки (первая из query/mutations) |
| `saving` | `boolean` | Идёт сохранение (create/update/archive) |
| `refetch()` | `() => Promise<void>` | Принудительное обновление |
| `createSupplier(input)` | `(input) => Promise<DirectorySupplier>` | Создание |
| `updateSupplier(id, input)` | `(id, input) => Promise<DirectorySupplier>` | Обновление |
| `archiveSupplier(id)` | `(id) => Promise<DirectorySupplier>` | Архивирование |

**Поведение:**
- `staleTime: 30_000` — данные считаются свежими 30 секунд
- `gcTime: 5 * 60_000` — кэш хранится 5 минут после unmount
- `refetchOnWindowFocus: true` — обновление при возврате на вкладку
- `placeholderData: (prev) => prev` — предыдущие данные показываются при фоновом обновлении
- После успешной мутации автоматически инвалидируются все ключи `directorySuppliers`

## Компоненты

| Компонент | Файл | Назначение |
|---|---|---|
| `SuppliersDirectoryPage` | `app/(main)/directories/suppliers/page.tsx` | Композиция: Toolbar + View |
| `SuppliersToolbar` | `features/directories/components/suppliers-toolbar.tsx` | `<Suspense>` → DirectoriesToolbar + кнопка «Добавить» |
| `DirectorySuppliersView` | `components/directory-suppliers-view.tsx` | `flex h-full min-h-0 flex-1 flex-col` + скролл |
| `DirectorySuppliersSection` | `...details/components/directory-suppliers-section.tsx` | `"use client"`, вызывает `useDirectorySuppliers()`, маппит → Row |
| `DirectorySuppliersRow` | `...details/components/directory-suppliers-row.tsx` | Двухколоночный адаптивный layout: имя слева, метрики справа |
| `DirectorySuppliersName` | `...details/components/directory-suppliers-name.tsx` | Отображение названия с label «Название» |
| `DirectorySuppliersValue` | `...details/components/directory-suppliers-value.tsx` | `<Badge variant="outline">` с `label: value` |
| `DirectorySuppliersMetricGroup` | `...details/components/directory-suppliers-metric-group.tsx` | Группа метрик с заголовком (Цвет, Статус, ИНН, Телефон) |
| `DirectorySuppliersCreateDialog` | `...details/components/directory-suppliers-create-dialog.tsx` | Диалог создания: 5 полей + Select цвета (10 пресетов) |

### Поток данных в UI

```
page.tsx → <SuppliersToolbar /> + <DirectorySuppliersView />
  └─→ DirectorySuppliersView → DirectorySuppliersSection
        ├─→ useDirectorySuppliers()                       ← TanStack Query (fetch → /api/directory-suppliers)
        │     ├─→ suppliers[] (из кэша или свежие данные)
        │     ├─→ loading / isFetching / error
        │     └─→ createSupplier / updateSupplier / archiveSupplier
        └─→ DirectorySuppliersRow (×N)
              ├─→ DirectorySuppliersName (name)
              ├─→ MetricGroup (Цвет) → кружок цвета + Badge
              ├─→ MetricGroup (Статус) → Badge «Юр. лицо»/«Физ. лицо»
              ├─→ MetricGroup (ИНН) → DirectorySuppliersValue
              └─→ MetricGroup (Телефон) → DirectorySuppliersValue
```

### Диалог создания

Поля формы:
- **Наименование** (Input, обязательное)
- **Цвет** (Select: 10 пресетов с preview-кружком)
- **Статус** (Select: Юр. лицо / Физ. лицо, обязательное)
- **ИНН** (Input)
- **Телефон** (Input, placeholder: `+7 (XXX) XXX-XX-XX`)

Кнопки: «Отмена» + «Создать».
`handleCreate()` вызывает `createSupplier()` из хука → мутация TanStack Query → POST `/api/directory-suppliers` → Zod-валидация → запись в БД → инвалидация кэша.

### Поиск

Реализован через `DirectoriesToolbar`: обновляет URL query-параметр `?q=`.
Хук `useDirectorySuppliers()` читает параметр через `useSearchParams()`,
передаёт в `fetchDirectorySuppliers({ q })`, API фильтрует по `normalizedName` через `ILIKE`.

### Состояния UI

Хук возвращает флаги для всех состояний:
- **loading** — спиннер/скелетон при первичной загрузке
- **error** — сообщение об ошибке
- **empty** — `suppliers.length === 0 && !loading` → заглушка «Нет поставщиков»
- **saving** — индикатор сохранения во время мутаций
- **isFetching** — индикатор фонового обновления (без скрытия текущих данных)

## Tenant boundary

Изоляция через `workspace_owner_id` (FK → `profiles.id`). Пользователь видит
только поставщиков своего workspace. RLS-политики определены в миграциях Supabase
(миграция 019 — `directory_suppliers_foundation`).

Все API-запросы автоматически изолируются по workspace: сервисный слой получает
`workspaceOwnerId` из сессии и передаёт в репозиторий, который добавляет
`.where(eq(directorySuppliers.workspaceOwnerId, workspaceOwnerId))` ко всем запросам.

## Серверная архитектура

Модуль использует многослойную архитектуру:

```
API Routes (Next.js App Router)
  ↓
Route Handlers (directory-suppliers.route-handlers.ts)
  ← Zod-валидация через directory-suppliers.schemas.ts
  ↓
Service Layer (directory-suppliers.service.ts)
  ↓
Repository Layer (directory-suppliers.repository.ts)
  ← Drizzle ORM (db/schema/directory-suppliers.ts)
  ↓
PostgreSQL (Supabase)
```

### Слой route-handlers

- `handleDirectorySuppliersListRequest` — парсит query-параметры → list → JSON-ответ
- `handleDirectorySupplierCreateRequest` — парсит тело запроса → create → JSON-ответ
- `handleDirectorySupplierDetailRequest` — парсит id → get → JSON-ответ
- `handleDirectorySupplierUpdateRequest` — парсит id + тело → update → JSON-ответ
- `handleDirectorySupplierArchiveRequest` — парсит id → archive → JSON-ответ
- `handleDirectorySuppliersRouteError` — унифицированная обработка ошибок (ZodError, ApiError, InternalError)

### Слой сервиса

- `listDirectorySuppliers(params)` — список с фильтрацией/поиском/сортировкой/пагинацией
- `createDirectorySupplier(input)` — создание с нормализацией имени
- `getDirectorySupplier(id)` — получение по id с проверкой workspace
- `updateDirectorySupplier(id, input)` — обновление с оптимистичной блокировкой (version)
- `archiveDirectorySupplier(id)` — soft-delete (установка archivedAt)

### Слой репозитория

Прямые SQL-запросы через Drizzle ORM с фильтрацией по `workspaceOwnerId` и `deletedAt IS NULL`.
