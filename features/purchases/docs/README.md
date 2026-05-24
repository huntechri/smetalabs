# Закупки сметы (purchases)

> 2026-05-24 · статус: API-клиент реализован, React Query подключён, состояния loading/empty/error

---

## 1. Назначение

Модуль `purchases` — **вкладка «Закупки» сметы**, отображающая план-фактный анализ закупок материалов для конкретной сметы. Сравнивает плановые показатели (из сметы) с фактическими (по данным закупок) и рассчитывает отклонения.

Вкладка доступна из интерфейса сметы:
```
Смета → [Состав] [Закупки] [Исполнение] [Финансы] [Документы]
                 ^^^^^^^^^
```

### Отличие от глобальных закупок

| Характеристика | `features/purchases/` | `features/global-purchases/` |
|---|---|---|
| **Контекст** | Внутри конкретной сметы | Уровень workspace (все проекты) |
| **Данные** | Только чтение (статические бейджи) | Inline-редактирование (EditableBadge) |
| **Тулбар** | Общий для всех вкладок сметы | Собственный (поиск + фильтры + действия) |
| **Источник данных** | RPC `get_estimate_purchases` (агрегация плана + факта) | Таблица `global_purchases` |
| **Роутинг** | `/projects/:pid/estimates/:eid/purchases` | `/procurements` |

---

## 2. Структура модуля

```
features/purchases/
├── __mocks__/
│   └── purchases.ts                              # Мок-данные: 10 строк закупок (fallback при отсутствии API)
├── api/
│   ├── purchases-client.ts                       # API-клиент: fetch → /api/projects/.../purchases
│   └── purchases-query-keys.ts                   # Ключи кэширования React Query
├── hooks/
│   └── use-purchases.ts                          # Хук с React Query (useQuery + фильтрация)
├── components/
│   └── purchases-view.tsx                        # Обёртка со скроллом (принимает estimateId, projectId)
└── purchase-details/
    └── components/
        ├── purchase-section.tsx                   # Композиция списка + состояния (loading/empty/error)
        ├── purchase-row.tsx                       # Строка закупки (план/факт/отклонение)
        ├── purchase-name.tsx                      # Название материала + ед. измерения
        ├── purchase-value.tsx                     # Бейдж с поддержкой денег и цвета отклонения
        └── purchase-metric-group.tsx              # Группа метрик с заголовком
```

### Роутинг

```
app/(main)/projects/[projectId]/estimates/[estimateId]/purchases/page.tsx
```

Страница — серверный компонент, извлекает `projectId` и `estimateId` из params, передаёт в `<PurchasesView />`.

---

## 3. API

### 3.1 API Route

**Файл:** `app/api/projects/[id]/estimate-records/[recordId]/purchases/route.ts`

- **Метод:** GET
- **Аутентификация:** Supabase `auth.getUser()` + `requireCurrentWorkspace()`
- **Валидация:** Проверка принадлежности сметы проекту и workspace
- **RPC:** `get_estimate_purchases(p_estimate_record_id, p_workspace_owner_id)`
- **Поиск:** Поддержка `?q=` для фильтрации по `title` (серверная)
- **Возвращает:** `{ data: PurchaseRow[] }`

### 3.2 API Client

**Файл:** `features/purchases/api/purchases-client.ts`

```typescript
export function fetchEstimatePurchases(params: EstimatePurchasesParams): Promise<EstimatePurchasesResponse>
```

Параметры:
- `projectId: string` — ID проекта
- `estimateId: string` — ID сметы (estimate record)
- `q?: string` — поисковый запрос (опционально)

### 3.3 Query Keys

```typescript
export const purchasesQueryKeys = {
  all: ["estimatePurchases"] as const,
  list: (params) => [...purchasesQueryKeys.all, "list", params] as const,
}
```

---

## 4. Типы данных

```typescript
// types/purchase.ts
export type PurchaseRow = {
  materialId: string | null     // ID материала в справочнике (null = без привязки)
  title: string                 // Наименование материала
  unit: string                  // Единица измерения (шт, м, м², и т.д.)
  planQuantity: number          // Плановое количество
  planPrice: number             // Плановая цена за единицу
  planTotal: number             // Плановый итог (qty × price)
  factQuantity: number | null   // Фактическое количество (null = нет данных)
  factAvgPrice: number | null   // Фактическая средневзвешенная цена
  factTotal: number | null      // Фактический итог
  deviationTotal: number | null // Отклонение (plan − fact)
}
```

---

## 5. Компоненты

### 5.1 `PurchasesView` — обёртка

Принимает `estimateId` и `projectId`, передаёт в `PurchaseSection`.

### 5.2 `PurchaseSection` — состояния

Четыре состояния:

| Состояние | Условие | Отображение |
|---|---|---|
| **Loading** | `isLoading === true` | 5 скелетон-строк (`PurchaseRowSkeleton`) |
| **Error** | `isError === true` | `<Empty>` с `WarningIcon`, текстом ошибки, кнопкой Retry |
| **Empty** | `purchases.length === 0` | `<Empty>` с `ShoppingCartIcon`, «Нет закупок» |
| **Data** | `purchases.length > 0` | Список `PurchaseRow` |

### 5.3 `PurchaseRow` — строка закупки

Read-only: все значения через `PurchaseValue` (статический `Badge`).

**Сетка:** `lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]`

**Три группы метрик:**

| Группа | Поля | Компонент |
|---|---|---|
| **План** | Кол-во, Цена, Итого | `PurchaseValue` (Badge, readonly) |
| **Факт** | Кол-во, Ср. цена, Итого | `PurchaseValue` (Badge, readonly) |
| **Отклонение** | Итого (со знаком +/−) | `PurchaseValue` (deviation=true, цветной) |

**Ключ строки:** `row.materialId ?? `purchase-${index}`` (fallback для null materialId)

### 5.4 `PurchaseName` — название + ед. измерения

```tsx
export function PurchaseName({ title, unit }: { title: string; unit: string })
```

Показывает название материала жирным шрифтом, ниже — единицу измерения мелким muted-текстом.

### 5.5 `PurchaseValue` — бейдж значения

Новые возможности:
- **`deviation`** (bool) — включает цветовое кодирование (зелёный/красный) и знак `+`
- **`value`** — number | string | null (null → «—»)
- **Форматирование денег:** автоматическое через `formatMoney()` для числовых значений

**Цветовая кодировка отклонения:**
- `> 0` (экономия) → зелёный оттенок (`border-emerald-200 bg-emerald-50 text-emerald-700`)
- `< 0` (перерасход) → красный оттенок (`border-red-200 bg-red-50 text-red-700`)
- `= 0` → нейтральный

### 5.6 `PurchaseMetricGroup` — группа метрик

Без изменений. Идентичен `ExecutionMetricGroup`.

---

## 6. Хук `usePurchases`

**Файл:** `features/purchases/hooks/use-purchases.ts`

```typescript
export function usePurchases({ estimateId, projectId }: UsePurchasesInput)
```

**Логика:**
1. Читает `?q=` из `useSearchParams()`
2. Формирует `queryParams` → React Query `useQuery` с `purchasesQueryKeys.list(params)`
3. Вызывает `fetchEstimatePurchases(params)` → API route → Supabase RPC
4. **Fallback:** при отсутствии данных от API использует моки из `__mocks__/purchases.ts`
5. Клиентская фильтрация по `q` (дополнительный safety net)

**Возвращает:**
- `purchases: PurchaseRow[]`
- `isLoading: boolean`
- `isFetching: boolean`
- `isError: boolean`
- `error: string | null`
- `search: string`
- `refetch: () => Promise<void>`

---

## 7. БД и API (бэкенд)

### Таблица `project_estimate_purchases`

Миграция 047 — фактические закупки на уровне сметы. Отдельная таблица (не `global_purchases`): каждая смета ведёт собственный учёт закупок материалов.

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | uuid PK | |
| `workspace_owner_id` | uuid FK | Multi-tenant изоляция |
| `estimate_record_id` | uuid FK | FK → `project_estimate_records` ON DELETE CASCADE |
| `directory_material_id` | uuid FK | nullable, FK → `directory_materials` ON DELETE SET NULL |
| `estimate_material_id` | uuid FK | nullable, FK → `project_estimate_materials` ON DELETE SET NULL |
| `title` / `unit` | text | NOT NULL |
| `quantity` / `price` / `total` | numeric(14,3/14,2/14,2) | ≥ 0 |
| `supplier_name` / `purchase_date` / `notes` | text | nullable |
| `created_by` / `updated_by` | uuid FK | nullable (в отличие от глобальных закупок) |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete |

**RLS:** `private.workspace_can_read` (SELECT) / `private.workspace_can_write_directory` (INSERT/UPDATE/DELETE) — идентично другим таблицам смет.

**Tenant boundary:** `(id, workspace_owner_id)` — изоляция через RLS + проверка в RPC.

**Ограничения:** `chk_pep_title_not_empty`, `chk_pep_unit_not_empty`, `chk_pep_quantity_non_negative`, `chk_pep_price_non_negative`, `chk_pep_total_non_negative`.

### RPC `get_estimate_purchases` (v2)

Миграция 048 — SECURITY DEFINER, STABLE. Факт теперь из `project_estimate_purchases` (не `global_purchases`):

```sql
public.get_estimate_purchases(
  p_estimate_record_id uuid,
  p_workspace_owner_id uuid
)
RETURNS TABLE (
  material_id uuid,
  title text,
  unit text,
  plan_quantity numeric,
  plan_price numeric,
  plan_total numeric,
  fact_quantity numeric,
  fact_avg_price numeric,
  fact_total numeric,
  deviation_total numeric
)
```

### RPC для CRUD проектных закупок (v1)

Миграция 049 — SECURITY DEFINER, plpgsql:

- `add_project_estimate_purchase(p_estimate_record_id, p_workspace_owner_id, p_directory_material_id, ...)` → `jsonb` — создать запись, авторезолв title/unit из справочника
- `update_project_estimate_purchase(p_purchase_id, p_workspace_owner_id, p_quantity, p_price, ...)` → `jsonb` — частичное обновление, авто-пересчёт `total`
- `archive_project_estimate_purchase(p_purchase_id, p_workspace_owner_id, p_updated_by)` → `jsonb` (NULL) — soft delete

### Краевые случаи

| Случай | Поведение |
|---|---|
| Материал в плане есть, в факте нет | `fact_*` = NULL, `deviation_total = plan_total` |
| `directory_material_id IS NULL` | Строки исключаются из агрегации |
| `archived_at` / `deleted_at` не NULL | Строки исключаются (soft delete) |
| Несколько записей закупок с разными ценами | Взвешенная средняя цена: Σ(qty×price)/Σ(qty) |

---

## 8. Поиск

Поиск работает в двух слоях:
1. **Серверный** (`?q=` в API route) — фильтрация по `title.toLowerCase().includes(q)`
2. **Клиентский** (в хуке) — дополнительный safety net при использовании моков

Тулбар (`EstimateTabToolbar`) шлёт `?q=...` в URL, хук читает из `useSearchParams()`.

---

## 9. Мок-данные

**Файл:** `features/purchases/__mocks__/purchases.ts`

10 строк электротехнических материалов. Используются как fallback когда API ещё не отвечает или в процессе разработки. При появлении реальных данных от API — всегда показываются реальные данные.

---

## 10. Связанные файлы

- **Тип:** `types/purchase.ts` — `PurchaseRow`
- **API клиент:** `features/purchases/api/purchases-client.ts`
- **Query keys:** `features/purchases/api/purchases-query-keys.ts`
- **API route:** `app/api/projects/[id]/estimate-records/[recordId]/purchases/route.ts`
- **Хук:** `features/purchases/hooks/use-purchases.ts`
- **Тулбар:** `features/estimates/estimate-tabs/components/estimate-tab-toolbar.tsx`
- **Layout сметы:** `app/(main)/projects/[projectId]/estimates/[estimateId]/layout.tsx`
- **Глобальные закупки:** `features/global-purchases/` (аналогичная структура, другой контекст)
