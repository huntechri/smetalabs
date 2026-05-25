# Закупки сметы (purchases)

> 2026-05-25 · статус: API-клиент реализован, React Query подключён, адаптивная верстка с выносом ед. изм. в отдельную карточку, бэкенд переведен на FULL OUTER JOIN для поддержки внепланового факта.

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
| **Данные** | Чтение + Inline-редактирование факта | Inline-редактирование (EditableBadge) |
| **Тулбар** | Общий для всех вкладок сметы | Собственный (поиск + фильтры + действия) |
| **Источник данных** | RPC `get_estimate_purchases` (план + факт) | Таблица `global_purchases` |
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
        ├── purchase-name.tsx                      # Карточка названия материала (без ед. измерения)
        ├── purchase-unit.tsx                      # Вынесенная карточка единицы измерения (76px / w-full)
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

Принимает `estimateId` и `projectId`, передаёт в `PurchaseSection`. Использует стандартные CSS-переменные темы и имеет `p-1` для мягкого отступа по внешнему контуру скролла.

### 5.2 `PurchaseSection` — состояния

Список строк и скелетонов загрузки выводится внутри контейнера с отступами `p-3 gap-3`. Это гарантирует, что межстрочные расстояния и отступы от краёв родительского контейнера составляют ровно `12px`.

Четыре состояния:

| Состояние | Условие | Отображение |
|---|---|---|
| **Loading** | `isLoading === true` | 5 скелетон-строк (`PurchaseRowSkeleton`) в контейнере `p-3 gap-3` |
| **Error** | `isError === true` | `<Empty>` с `WarningIcon`, текстом ошибки, кнопкой Retry |
| **Empty** | `purchases.length === 0` | `<Empty>` с `ShoppingCartIcon`, «Нет закупок» |
| **Data** | `purchases.length > 0` | Список `PurchaseRow` в контейнере `p-3 gap-3` |

### 5.3 `PurchaseRow` — строка закупки

Состоит из левой части (название, единица измерения и действия) и правой части (группы плановых и фактических метрик).

* **Сетка (Desktop):** `lg:grid-cols-[minmax(300px,1fr)_minmax(600px,1.3fr)] gap-3`
* **Внутренний отступ:** `p-3` (`12px`) от внешних границ до вложенных карточек.
* **Правая колонка (Метрики):** Три группы выстроены через `md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)] gap-3`. Зазор увеличен до `12px` для лучшей читаемости.

### 5.4 `PurchaseName` — название
Выделенный карточный элемент названия с заголовком `Наименование`. Не содержит внутри единицы измерения.

### 5.5 `PurchaseUnit` — единица измерения
Отдельная карточка `Ед. изм` с адаптивной логикой:
* **На мобильных устройствах (<640px):** Контейнер названия и ед. изм. перестраивается в `flex-col`, а карточка ед. изм. растягивается на всю ширину `w-full` под названием, создавая чистые строки без деформации сетки.
* **На экранах от 640px (sm):** Карточки выстраиваются в строку `flex-row`, при этом ед. изм. имеет жесткую ширину `sm:w-[76px] shrink-0`.

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

---

## 7. БД и API (бэкенд)

### Таблица `project_estimate_purchases`

Миграция 047 — фактические закупки на уровне сметы.

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
| `created_by` / `updated_by` | uuid FK | nullable |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete |

### RPC `get_estimate_purchases` (v3)

Миграция 050 — SECURITY DEFINER, STABLE. 
Запрос выполняет **`FULL OUTER JOIN`** между плановыми материалами сметы (`project_estimate_materials`) и агрегированным фактом.

Фактические закупки (`fact_raw`) собираются и суммируются из двух независимых таблиц:
1. **`project_estimate_purchases`** — локальные закупки, записанные на уровне данной сметы.
2. **`global_purchases`** — сводные закупки по всему воркспейсу, привязанные к родительскому проекту данной сметы (`project_id`).

Благодаря этому внеплановые закупки (не заложенные в смету изначально, но купленные в ходе проекта) отображаются в списке с `plan_quantity = 0` и отрицательным отклонением.

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

### Краевые случаи

| Случай | Поведение |
|---|---|
| Материал есть в смете, но не закупался | `fact_*` = NULL, `deviation_total = plan_total` |
| Позиция не учтена в смете, но куплена (внеплановый факт) | `plan_* = 0`, отображаются значения факта, `deviation_total = -fact_total` (перерасход) |
| `directory_material_id IS NULL` | Группировка по `title` и `unit`, позиция отображается как внеплановый факт |
| `archived_at` / `deleted_at` не NULL | Закупки исключаются из подсчета (soft delete) |
| Несколько закупок по разным ценам | Рассчитывается средневзвешенная цена: $\sum(qty \times price) / \sum(qty)$ |
