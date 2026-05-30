# Справочник контрагентов (directory-counterparties)

> 2026-05-30 · статус: production | декомпозирован по **4-слойному стандарту** (`api`, `model`, `application`, `ui`). [Epic #196](https://github.com/huntechri/smetalabs/issues/196), Issue #205.

## Назначение

Управление справочником контрагентов — заказчиков и подрядчиков (юридических и физических лиц).
Поддерживает раздельные наборы полей для юрлиц (банковские реквизиты) и физлиц (паспортные данные).
Модуль предоставляет просмотр списка, поиск, создание, редактирование и архивирование записей
с полной интеграцией через API и TanStack Query.

**Маршрут:** `/directories/counterparties`
**Страница:** `app/(main)/directories/counterparties/page.tsx`

---

## Структура модуля

```
features/directory-counterparties/
├── api/
│   ├── directory-counterparties-client.ts       # HTTP-клиент (fetch → /api/directory-counterparties)
│   ├── directory-counterparties-query-keys.ts   # Ключи кэширования React Query
│   └── directory-counterparties-errors.ts       # Типизированные ошибки API
├── model/
│   ├── directory-counterparties-model.ts        # Типы, события, доменные хелперы, парсеры URL-параметров
│   └── directory-counterparties-model.test.ts   # Unit-тесты модели (22 теста)
├── application/
│   └── use-directory-counterparties.ts          # TanStack Query: useQuery + useMutation (create/update/archive)
├── ui/
│   ├── directory-counterparties-view.tsx         # Layout-обёртка со скроллом
│   ├── directory-counterparties-section.tsx      # "use client" — список контрагентов + пагинация
│   ├── directory-counterparties-row.tsx          # Строка: имя + тип + статус + телефон + банк
│   ├── directory-counterparties-name.tsx         # Отображение наименования
│   ├── directory-counterparties-value.tsx        # Бейдж «label: value»
│   ├── directory-counterparties-metric-group.tsx # Группа метрик с заголовком
│   └── directory-counterparties-create-dialog.tsx# Диалог с условной логикой (юр/физ)
└── server/                                       # Серверный слой (без изменений)
    ├── directory-counterparties.route-handlers.ts
    ├── directory-counterparties.schemas.ts
    ├── directory-counterparties.service.ts
    └── directory-counterparties.repository.ts

app/api/directory-counterparties/
├── route.ts                                   # GET (список), POST (создание)
└── [id]/route.ts                              # GET (детали), PATCH (обновление), DELETE (архивирование)

db/schema/
└── directory-counterparties.ts                # Drizzle-схема таблицы directory_counterparties

features/directories/ui/
└── counterparties-toolbar.tsx                 # Тулбар: поиск + кнопка «Добавить»
```

---

## Карта зависимостей слоёв

```
ui/  →  application/  →  api/
ui/  →  model/
application/  →  model/
api/  →  model/
```

Слой `ui/` никогда не обращается напрямую к `api/`. Все сетевые вызовы инкапсулированы в `api/directory-counterparties-client.ts` и оркестрируются хуком в `application/`.

---

## Слой `model/`

### `directory-counterparties-model.ts`

Содержит:

#### Типы
- `CounterpartyType` = `"customer" | "contractor"`
- `LegalStatus` = `"juridical" | "individual"`
- `DirectoryCounterpartyStatus` = `"active" | "archived"`
- `DirectoryCounterpartiesSort` = `"relevance" | "updated_desc" | "name_asc"`
- `BankDetails`, `PassportData`
- `DirectoryCounterpartiesListParams`, `DirectoryCounterpartyMutationInput`
- `DirectoryCounterparty`, `DirectoryCounterpartiesListMeta`, `DirectoryCounterpartiesListResponse`

#### События
```typescript
DIRECTORY_COUNTERPARTIES_CREATE_EVENT = "directory-counterparties:create"
```

#### Доменные хелперы
```typescript
getCounterpartyTypeLabel(type: CounterpartyType): string  // "Заказчик" / "Подрядчик"
getLegalStatusLabel(status: LegalStatus): string          // "Юр. лицо" / "Физ. лицо"
```

#### Парсеры URL-параметров (для application/)
```typescript
getStringParam(searchParams, key): string | undefined
getNumberParam(searchParams, key): number | undefined
getSortParam(searchParams): DirectoryCounterpartiesSort | undefined
getListParams(searchParams): DirectoryCounterpartiesListParams
```

---

## Слой `application/`

### `use-directory-counterparties.ts`

Хук полностью на TanStack Query. Читает параметры из URL (`useSearchParams`) через `getListParams` из `model/`, автоматически перезапрашивает данные при изменении фильтров.

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

---

## Слой `ui/`

### Поток данных

```
page.tsx → <CounterpartiesToolbar /> + <DirectoryCounterpartiesView />
  └─→ DirectoryCounterpartiesView → DirectoryCounterpartiesSection
        ├─→ useDirectoryCounterparties()           ← application/
        │     ├─→ counterparties[] (кэш / API)
        │     ├─→ loading / isFetching / error
        │     └─→ createCounterparty / updateCounterparty / archiveCounterparty
        └─→ DirectoryCounterpartiesRow (×N)
              ├─→ DirectoryCounterpartiesName
              ├─→ MetricGroup (Тип) → Badge (getCounterpartyTypeLabel / getLegalStatusLabel)
              ├─→ MetricGroup (Контакты) → DirectoryCounterpartiesValue + меню действий
              └─→ MetricGroup (Банк/БИК) → только для juridical
```

### Диалог создания (`directory-counterparties-create-dialog.tsx`)

Условная логика в зависимости от выбранного `legalStatus`:

**Всегда:** Наименование, Тип (заказчик/подрядчик), Статус (юр/физ), ИНН, Телефон.

**Юрлицо (`juridical`):** юридический адрес, банк, БИК, корр. счёт, расч. счёт.

**Физлицо (`individual`):** серия + номер паспорта, кем выдан, дата выдачи, код подразделения, адрес регистрации.

---

## API

| Метод | Путь | Назначение |
|-------|------|-----------|
| `GET` | `/api/directory-counterparties` | Список с пагинацией, поиском, сортировкой |
| `POST` | `/api/directory-counterparties` | Создание нового контрагента |
| `GET` | `/api/directory-counterparties/[id]` | Детали одного контрагента |
| `PATCH` | `/api/directory-counterparties/[id]` | Обновление существующего |
| `DELETE` | `/api/directory-counterparties/[id]` | Soft-delete (архивирование) |

### Параметры GET-запроса списка

| Параметр | По умолчанию | Описание |
|----------|--------------|----------|
| `q` | — | Поиск по `searchText` |
| `status` | `"active"` | `"active"` \| `"archived"` |
| `limit` | `50` | Количество записей |
| `cursor` | `0` | Смещение |
| `sort` | `"relevance"` | `"relevance"` \| `"updated_desc"` \| `"name_asc"` |

---

## Текущее состояние

| Задача | Статус | Комментарий |
|---|---|---|
| **4-слойная декомпозиция** | ✅ Готова | `api`, `model`, `application`, `ui` — разделены согласно стандарту. |
| **БД-схема и RLS** | ✅ Готова | Таблица `directory_counterparties` защищена RLS. |
| **API Route Handlers** | ✅ Готовы | Все 5 эндпоинтов реализованы и работают. |
| **TanStack Query-хук** | ✅ Готов | `use-directory-counterparties` в `application/`. |
| **Список с пагинацией** | ✅ Готов | Курсорная пагинация через URL-параметры. |
| **Поиск** | ✅ Готов | `?q=` синхронизирован с `DirectoriesToolbar`. |
| **Создание/Редактирование** | ✅ Готово | Диалог с условными полями юр/физ. |
| **Архивирование** | ✅ Готово | Soft-delete через DELETE /api/... |
| **Unit-тесты модели** | ✅ Готовы | 22 теста в `model/directory-counterparties-model.test.ts`. |
