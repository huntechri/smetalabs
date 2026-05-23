# Справочник контрагентов (directory-counterparties)

> Статус: production | 2026-05-22

## Назначение

Управление справочником контрагентов — заказчиков и подрядчиков (юридических и физических лиц).
Поддерживает раздельные наборы полей для юрлиц (банковские реквизиты) и физлиц (паспортные данные).
Модуль предоставляет просмотр списка, поиск, создание, редактирование и архивирование записей
с полной интеграцией через API и TanStack Query.

**Маршрут:** `/directories/counterparties`
**Страница:** `app/(main)/directories/counterparties/page.tsx`

## Структура модуля

```
features/directory-counterparties/
├── api/
│   ├── directory-counterparties-client.ts       # TanStack Query-клиент (fetch, create, update, archive)
│   ├── directory-counterparties-query-keys.ts   # Ключи кэширования и теги инвалидации
│   └── directory-counterparties-errors.ts       # Ошибки API-клиента
├── components/
│   └── directory-counterparties-view.tsx        # Layout-обёртка со скроллом
├── directory-counterparties-details/
│   └── components/
│       ├── directory-counterparties-section.tsx      # "use client" — список контрагентов
│       ├── directory-counterparties-row.tsx          # Строка: имя + тип + статус + ИНН + телефон
│       ├── directory-counterparties-name.tsx         # Отображение наименования
│       ├── directory-counterparties-value.tsx        # Бейдж «label: value»
│       ├── directory-counterparties-metric-group.tsx # Группа метрик с заголовком
│       └── directory-counterparties-create-dialog.tsx# Диалог: условные поля (юр/физ)
├── hooks/
│   └── use-directory-counterparties.ts          # TanStack Query: useQuery + useMutation (create/update/archive)
├── server/
│   ├── directory-counterparties.route-handlers.ts    # Обработчики API-роутов (list, detail, create, update, archive)
│   ├── directory-counterparties.schemas.ts           # Zod-схемы валидации
│   ├── directory-counterparties.service.ts           # Бизнес-логика
│   └── directory-counterparties.repository.ts        # Доступ к БД через Drizzle
└── types.ts                                    # Типы модуля

app/api/directory-counterparties/
├── route.ts                                   # GET (список), POST (создание)
└── [id]/route.ts                              # GET (детали), PATCH (обновление), DELETE (архивирование)

db/schema/
└── directory-counterparties.ts                # Drizzle-схема таблицы directory_counterparties

features/directories/components/
└── counterparties-toolbar.tsx                 # Тулбар: поиск + кнопка «Добавить»
```

## Данные

### Типы TypeScript (`types.ts`)

```typescript
export type CounterpartyType = "customer" | "contractor"
export type LegalStatus = "juridical" | "individual"
export type DirectoryCounterpartyStatus = "active" | "archived"
export type DirectoryCounterpartiesSort = "relevance" | "updated_desc" | "name_asc"

export type BankDetails = {
  bankName: string | null
  bik: string | null
  corrAccount: string | null
  accountNumber: string | null
}

export type PassportData = {
  series: string | null
  number: string | null
  issuedBy: string | null
  issueDate: string | null
  departmentCode: string | null
  registrationAddress: string | null
}

export type DirectoryCounterparty = {
  id: string
  name: string
  type: CounterpartyType
  legalStatus: LegalStatus
  inn: string | null
  phone: string | null
  legalAddress: string | null
  bankDetails: BankDetails           // Только для юрлиц
  passport: PassportData             // Только для физлиц
  status: DirectoryCounterpartyStatus
  version: number
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string | null
    updatedBy: string | null
  }
}
```

**Особенность:** `bankDetails` и `passport` — условные поля. В TypeScript-типе
сгруппированы в подобъекты для удобства. Для юрлиц присутствуют `bankDetails`,
для физлиц — `passport`. На уровне БД все поля — отдельные nullable-колонки.

### `DirectoryCounterpartiesListParams` (параметры запроса списка)

```typescript
export type DirectoryCounterpartiesListParams = {
  q?: string            // Поисковый запрос
  status?: DirectoryCounterpartyStatus  // "active" | "archived" (по умолчанию "active")
  limit?: number        // Размер страницы (по умолчанию 50)
  cursor?: number       // Смещение для пагинации (по умолчанию 0)
  sort?: DirectoryCounterpartiesSort  // "relevance" | "updated_desc" | "name_asc"
}
```

### `DirectoryCounterpartyMutationInput` (создание/обновление)

```typescript
export type DirectoryCounterpartyMutationInput = {
  name: string                      // Обязательно
  type: CounterpartyType            // Обязательно: "customer" | "contractor"
  legalStatus: LegalStatus          // Обязательно: "juridical" | "individual"
  inn?: string | null
  phone?: string | null
  legalAddress?: string | null      // Только для юрлиц
  bankName?: string | null          // Только для юрлиц
  bik?: string | null               // Только для юрлиц
  corrAccount?: string | null       // Только для юрлиц
  accountNumber?: string | null     // Только для юрлиц
  passportSeries?: string | null    // Только для физлиц
  passportNumber?: string | null    // Только для физлиц
  passportIssuedBy?: string | null  // Только для физлиц
  passportIssueDate?: string | null // Только для физлиц
  passportDepartmentCode?: string | null  // Только для физлиц
  registrationAddress?: string | null     // Только для физлиц
}
```

### `DirectoryCounterpartiesListResponse` (ответ API)

```typescript
export type DirectoryCounterpartiesListResponse = {
  data: DirectoryCounterparty[]
  meta: {
    limit: number
    cursor: number
    nextCursor: number | null
    hasMore: boolean
    total: number
  }
}
```

### Схема БД (`db/schema/directory-counterparties.ts`)

Таблица `directory_counterparties` с полной схемой Drizzle ORM:

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `uuid` | Первичный ключ (defaultRandom) |
| `workspaceOwnerId` | `uuid` → `profiles.id` | Tenant-изоляция (FK, cascade delete) |
| `name` | `text` (NOT NULL) | Наименование контрагента |
| `normalizedName` | `text` (NOT NULL) | Нормализованное имя для поиска |
| `type` | `enum` (NOT NULL) | `customer` / `contractor` |
| `legalStatus` | `enum` (NOT NULL) | `juridical` / `individual` |
| `inn` | `text` | ИНН |
| `phone` | `text` | Телефон |
| `legalAddress` | `text` | Юридический адрес (юрлица) |
| `bankName` | `text` | Наименование банка (юрлица) |
| `bik` | `text` | БИК (юрлица) |
| `corrAccount` | `text` | К/С (юрлица) |
| `accountNumber` | `text` | Р/С (юрлица) |
| `passportSeries` | `text` | Серия паспорта (физлица) |
| `passportNumber` | `text` | Номер паспорта (физлица) |
| `passportIssuedBy` | `text` | Кем выдан (физлица) |
| `passportIssueDate` | `text` | Дата выдачи (физлица) |
| `passportDepartmentCode` | `text` | Код подразделения (физлица) |
| `registrationAddress` | `text` | Адрес регистрации (физлица) |
| `searchText` | `text` (NOT NULL) | Полнотекстовый поиск |
| `status` | `enum` (NOT NULL, default `active`) | `active` / `archived` |
| `version` | `integer` (NOT NULL, default 1) | Оптимистичная блокировка |
| `createdBy` | `uuid` → `profiles.id` | Кто создал (restrict delete) |
| `updatedBy` | `uuid` → `profiles.id` | Кто обновил (set null) |
| `createdAt` | `timestamptz` (NOT NULL, default now) | Дата создания |
| `updatedAt` | `timestamptz` (NOT NULL, default now) | Дата обновления |
| `archivedAt` | `timestamptz` | Дата архивирования |
| `deletedAt` | `timestamptz` | Дата удаления (soft delete) |

**Индексы:**
- `uq_directory_counterparties_id_workspace` — уникальный (id, workspaceOwnerId)
- `uq_directory_counterparties_workspace_inn_active` — условный уникальный (workspaceOwnerId, inn) для активных записей
- `idx_directory_counterparties_workspace_status_deleted` — (workspaceOwnerId, status, deletedAt)
- `idx_directory_counterparties_workspace_type` — (workspaceOwnerId, type)
- `idx_directory_counterparties_workspace_legal_status` — (workspaceOwnerId, legalStatus)
- `idx_directory_counterparties_workspace_normalized_name` — (workspaceOwnerId, normalizedName)
- `idx_directory_counterparties_workspace_updated_at` — (workspaceOwnerId, updatedAt)

**Ограничения (CHECK):**
- `name` не пустое
- `version > 0`

### Связи с другими таблицами

- `projects.customer_counterparty_id` → `directory_counterparties.id` — связь проекта с заказчиком

## API

Все эндпоинты реализованы и работают в production.

### Эндпоинты

| Метод | Путь | Назначение |
|-------|------|-----------|
| `GET` | `/api/directory-counterparties` | Список контрагентов с пагинацией, поиском, сортировкой и фильтрацией по статусу |
| `POST` | `/api/directory-counterparties` | Создание нового контрагента (с условной валидацией полей юр/физ лица) |
| `GET` | `/api/directory-counterparties/[id]` | Детали одного контрагента |
| `PATCH` | `/api/directory-counterparties/[id]` | Обновление существующего контрагента |
| `DELETE` | `/api/directory-counterparties/[id]` | Soft-delete (архивирование — установка `archivedAt`) |

### Параметры GET-запроса списка

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `q` | `string` | — | Поиск по `searchText` |
| `status` | `"active"` \| `"archived"` | `"active"` | Фильтр по статусу |
| `limit` | `number` | `50` | Количество записей на странице |
| `cursor` | `number` | `0` | Смещение для курсорной пагинации |
| `sort` | `"relevance"` \| `"updated_desc"` \| `"name_asc"` | `"relevance"` | Сортировка |

### Валидация

Все входящие данные валидируются через Zod-схемы (`server/directory-counterparties.schemas.ts`):
- `parseDirectoryCounterpartiesListParams` — параметры списка
- `parseDirectoryCounterpartyId` — UUID идентификатора
- `parseDirectoryCounterpartyMutationBody` — тело создания/обновления с условной валидацией:
  - Для `legalStatus: "juridical"` — не требуются паспортные поля
  - Для `legalStatus: "individual"` — не требуются банковские поля

### Формат ошибок

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Контрагент не найден"
  }
}
```

Коды ошибок: `BAD_REQUEST` (400), `NOT_FOUND` (404), `CONFLICT` (409), `INTERNAL_ERROR` (500).

## TanStack Query-интеграция

### Клиент (`api/directory-counterparties-client.ts`)

```typescript
fetchDirectoryCounterparties(params)          // GET /api/directory-counterparties
fetchDirectoryCounterparty(id)                // GET /api/directory-counterparties/:id
createDirectoryCounterparty(input)            // POST /api/directory-counterparties
updateDirectoryCounterparty({ id, input })    // PATCH /api/directory-counterparties/:id
archiveDirectoryCounterparty(id)              // DELETE /api/directory-counterparties/:id
```

Все функции используют `fetch` с `credentials: "include"` — куки передаются автоматически,
авторизация через Supabase RLS на сервере.

Ошибки обрабатываются через `throwDirectoryCounterpartiesApiError(response, resource)` —
при HTTP-ошибке парсится JSON-ответ и выбрасывается `DirectoryCounterpartiesApiError`.

### Ключи кэширования (`api/directory-counterparties-query-keys.ts`)

```typescript
directoryCounterpartiesQueryKeys.all          // ["directoryCounterparties"]
directoryCounterpartiesQueryKeys.lists()      // ["directoryCounterparties", "list"]
directoryCounterpartiesQueryKeys.list(params) // ["directoryCounterparties", "list", params]
directoryCounterpartiesQueryKeys.details()    // ["directoryCounterparties", "detail"]
directoryCounterpartiesQueryKeys.detail(id)   // ["directoryCounterparties", "detail", id]
```

### Хук `useDirectoryCounterparties()` (`hooks/use-directory-counterparties.ts`)

Хук полностью на TanStack Query. Читает параметры из URL (`useSearchParams`),
автоматически перезапрашивает данные при изменении фильтров.

**Возвращаемое значение:**

| Поле | Тип | Описание |
|------|-----|----------|
| `counterparties` | `DirectoryCounterparty[]` | Массив контрагентов |
| `meta` | `DirectoryCounterpartiesListMeta \| null` | Метаданные пагинации |
| `params` | `DirectoryCounterpartiesListParams` | Текущие параметры запроса |
| `loading` | `boolean` | Идёт первичная загрузка (`isLoading`) |
| `isFetching` | `boolean` | Идёт фоновое обновление (`isFetching`) |
| `error` | `string \| null` | Текст ошибки (первая из query/mutations) |
| `saving` | `boolean` | Идёт сохранение (create/update/archive) |
| `refetch()` | `() => Promise<void>` | Принудительное обновление |
| `createCounterparty(input)` | `(input) => Promise<DirectoryCounterparty>` | Создание |
| `updateCounterparty(id, input)` | `(id, input) => Promise<DirectoryCounterparty>` | Обновление |
| `archiveCounterparty(id)` | `(id) => Promise<DirectoryCounterparty>` | Архивирование |

**Поведение:**
- `staleTime: 30_000` — данные считаются свежими 30 секунд
- `gcTime: 5 * 60_000` — кэш хранится 5 минут после unmount
- `refetchOnWindowFocus: true` — обновление при возврате на вкладку
- `placeholderData: (prev) => prev` — предыдущие данные показываются при фоновом обновлении
- После успешной мутации автоматически инвалидируются все ключи `directoryCounterparties`

## Компоненты

| Компонент | Файл | Назначение |
|---|---|---|
| `CounterpartiesDirectoryPage` | `app/(main)/directories/counterparties/page.tsx` | Композиция: Toolbar + View |
| `CounterpartiesToolbar` | `features/directories/components/counterparties-toolbar.tsx` | `<Suspense>` → DirectoriesToolbar + кнопка «Добавить» |
| `DirectoryCounterpartiesView` | `components/directory-counterparties-view.tsx` | `flex h-full min-h-0 flex-1 flex-col` + скролл |
| `DirectoryCounterpartiesSection` | `...details/components/directory-counterparties-section.tsx` | `"use client"`, вызывает `useDirectoryCounterparties()`, маппит → Row |
| `DirectoryCounterpartiesRow` | `...details/components/directory-counterparties-row.tsx` | Двухколоночный layout: имя слева, метрики справа |
| `DirectoryCounterpartiesName` | `...details/components/directory-counterparties-name.tsx` | Название с label |
| `DirectoryCounterpartiesValue` | `...details/components/directory-counterparties-value.tsx` | `<Badge>` с `label: value` |
| `DirectoryCounterpartiesMetricGroup` | `...details/components/directory-counterparties-metric-group.tsx` | Группа метрик с заголовком |
| `DirectoryCounterpartiesCreateDialog` | `...details/components/directory-counterparties-create-dialog.tsx` | Диалог с условной логикой (юр/физ) |

### Поток данных в UI

```
page.tsx → <CounterpartiesToolbar /> + <DirectoryCounterpartiesView />
  └─→ DirectoryCounterpartiesView → DirectoryCounterpartiesSection
        ├─→ useDirectoryCounterparties()                    ← TanStack Query (fetch → /api/directory-counterparties)
        │     ├─→ counterparties[] (из кэша или свежие данные)
        │     ├─→ loading / isFetching / error
        │     └─→ createCounterparty / updateCounterparty / archiveCounterparty
        └─→ DirectoryCounterpartiesRow (×N)
              ├─→ DirectoryCounterpartiesName (name)
              ├─→ MetricGroup (Тип) → Badge «Заказчик»/«Подрядчик»
              ├─→ MetricGroup (Статус) → Badge «Юр. лицо»/«Физ. лицо»
              ├─→ MetricGroup (ИНН) → DirectoryCounterpartiesValue
              └─→ MetricGroup (Телефон) → DirectoryCounterpartiesValue
```

### Строка контрагента

Отображает 4 метрики в правой колонке:
- **Тип:** `Badge` — «Заказчик» (default) или «Подрядчик» (secondary)
- **Статус:** `Badge` — «Юр. лицо» или «Физ. лицо»
- **ИНН:** `DirectoryCounterpartiesValue`
- **Телефон:** `DirectoryCounterpartiesValue`

### Диалог создания

Условная логика в зависимости от выбранного статуса (`legalStatus`):

**Всегда:** Наименование, Тип (заказчик/подрядчик), Статус (юр/физ), ИНН, Телефон.

**Юрлицо (`juridical`):** банковские реквизиты (5 полей):
- Юридический адрес
- Наименование банка
- БИК (9 цифр)
- К/С (20 цифр)
- Р/С (20 цифр)

**Физлицо (`individual`):** паспортные данные (6 полей):
- Серия (4 цифры) + Номер (6 цифр) — в одной строке (2 колонки)
- Кем выдан
- Дата выдачи (ДД.ММ.ГГГГ)
- Код подразделения (000-000)
- Адрес регистрации

`handleCreate()` вызывает `createCounterparty()` из хука → мутация TanStack Query → POST `/api/directory-counterparties` → Zod-валидация (включая условную) → запись в БД → инвалидация кэша.

### Поиск

Реализован через `DirectoriesToolbar`: обновляет URL query-параметр `?q=`.
Хук `useDirectoryCounterparties()` читает параметр через `useSearchParams()`,
передаёт в `fetchDirectoryCounterparties({ q })`, API фильтрует по `searchText` через `ILIKE`.

### Состояния UI

Хук возвращает флаги для всех состояний:
- **loading** — спиннер/скелетон при первичной загрузке
- **error** — сообщение об ошибке
- **empty** — `counterparties.length === 0 && !loading` → заглушка «Нет контрагентов»
- **saving** — индикатор сохранения во время мутаций
- **isFetching** — индикатор фонового обновления (без скрытия текущих данных)

## Tenant boundary

Изоляция через `workspace_owner_id`. RLS-политики определены в миграциях Supabase
(миграции 024–025 — `directory_counterparties` foundation и grants).
Связь с проектами через `projects.customer_counterparty_id` также изолирована
по workspace.

Все API-запросы автоматически изолируются по workspace: сервисный слой получает
`workspaceOwnerId` из сессии и передаёт в репозиторий, который добавляет
`.where(eq(directoryCounterparties.workspaceOwnerId, workspaceOwnerId))` ко всем запросам.

## Серверная архитектура

Модуль использует многослойную архитектуру:

```
API Routes (Next.js App Router)
  ↓
Route Handlers (directory-counterparties.route-handlers.ts)
  ← Zod-валидация через directory-counterparties.schemas.ts
  ↓
Service Layer (directory-counterparties.service.ts)
  ↓
Repository Layer (directory-counterparties.repository.ts)
  ← Drizzle ORM (db/schema/directory-counterparties.ts)
  ↓
PostgreSQL (Supabase)
```

### Слой route-handlers

- `handleDirectoryCounterpartiesListRequest` — парсит query-параметры → list → JSON-ответ
- `handleDirectoryCounterpartyCreateRequest` — парсит тело запроса → create → JSON-ответ
- `handleDirectoryCounterpartyDetailRequest` — парсит id → get → JSON-ответ
- `handleDirectoryCounterpartyUpdateRequest` — парсит id + тело → update → JSON-ответ
- `handleDirectoryCounterpartyArchiveRequest` — парсит id → archive → JSON-ответ
- `handleDirectoryCounterpartiesRouteError` — унифицированная обработка ошибок (ZodError, ApiError, InternalError)

### Слой сервиса

- `listDirectoryCounterparties(params)` — список с фильтрацией/поиском/сортировкой/пагинацией
- `createDirectoryCounterparty(input)` — создание с нормализацией имени
- `getDirectoryCounterparty(id)` — получение по id с проверкой workspace
- `updateDirectoryCounterparty(id, input)` — обновление с оптимистичной блокировкой (version)
- `archiveDirectoryCounterparty(id)` — soft-delete (установка archivedAt)

### Слой репозитория

Прямые SQL-запросы через Drizzle ORM с фильтрацией по `workspaceOwnerId` и `deletedAt IS NULL`.
