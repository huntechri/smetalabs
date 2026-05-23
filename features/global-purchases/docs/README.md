# Модуль «Глобальные закупки» (Global Purchases)

> 2026-05-22 · статус: вёрстка + моки (фронтенд), БД-схема готова, API не реализован

---

## 1. Назначение

Модуль «Глобальные закупки» — сводная ведомость закупок материалов по всем проектам. В отличие от закупок внутри конкретной сметы (вкладка «Закупки» в `features/purchases/`), глобальные закупки агрегируют потребности на уровне workspace и позволяют:

- Планировать закупки материалов (план vs факт)
- Сравнивать плановые и фактические показатели (количество, цена)
- Назначать поставщиков и даты закупки
- Привязывать позиции к конкретным проектам/объектам
- Фильтровать по объектам и датам
- Импортировать и экспортировать данные

---

## 2. Структура модуля

```
features/global-purchases/
├── __mocks__/
│   └── global-purchases.ts                      # Мок-данные: 10 позиций закупок
├── hooks/
│   └── use-global-purchases.ts                  # Хук состояния (useState)
└── global-purchases-details/
    └── components/
        ├── global-purchases-view.tsx             # Обёртка со скроллом
        ├── global-purchases-section.tsx          # Композиция (хук → map → Row)
        ├── global-purchases-row.tsx              # Строка закупки
        ├── global-purchases-name.tsx             # Наименование + ед. изм
        ├── global-purchases-value.tsx            # Бейдж «label: value»
        ├── global-purchases-metric-group.tsx     # Группа метрик
        └── global-purchases-toolbar.tsx          # Тулбар (поиск + фильтры + действия)
```

### Роутинг

```
app/(main)/procurements/page.tsx    # /procurements — список глобальных закупок
```

Страница собирает: `GlobalPurchasesToolbar` (с `Suspense`) + `GlobalPurchasesView`.

### Типы данных

```typescript
// types/global-purchases.ts
export type GlobalPurchaseRow = {
  id: string
  title: string            // Наименование материала
  unit: string             // Единица измерения
  planQuantity: number     // Плановое количество
  planPrice: number        // Плановая цена
  factQuantity: number     // Фактическое количество
  factPrice: number        // Фактическая цена
}
```

---

## 3. Таблица базы данных

### 3.1 `global_purchases` — сводные закупки (10 записей)

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор позиции |
| `workspace_owner_id` | uuid FK → profiles.id | Multi-tenant изоляция |
| `title` / `normalized_title` | text NOT NULL | Название материала (и нормализованное) |
| `unit` | text NOT NULL | Единица измерения |
| `plan_quantity` | numeric ≥ 0 | Плановое количество |
| `plan_price` | numeric ≥ 0 | Плановая цена |
| `fact_quantity` | numeric, nullable, ≥ 0 | Фактическое количество |
| `fact_price` | numeric, nullable, ≥ 0 | Фактическая цена |
| `supplier_id` / `supplier_name` | uuid/text, nullable | Поставщик (FK → directory_suppliers.id + денормализованное имя) |
| `project_id` / `project_title` | uuid/text, nullable | Проект/объект (FK → projects.id + денормализованное название) |
| `purchase_date` | text, nullable | Дата закупки |
| `status` | enum: `planned`, `ordered`, `partially_received`, `received`, `cancelled` | Статус |
| `notes` / `search_text` | text, nullable | Примечания и полнотекстовый поиск |
| `created_by` / `updated_by` | uuid FK → profiles.id | Аудит |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete |

### 3.2 Связанные таблицы

| Таблица | Связь |
|---|---|
| `projects` | `project_id` → projects.id (опционально) |
| `directory_suppliers` | `supplier_id` → directory_suppliers.id (опционально) |

### 3.3 Общие паттерны

- `workspace_owner_id` — multi-tenant изоляция
- Soft delete: `archived_at` + `deleted_at`
- Аудит: `created_by` / `updated_by` / `created_at` / `updated_at`
- Все ID: UUID
- Все суммы: constraint `≥ 0`

---

## 4. API

На момент 2026-05-22 **API-роутов для глобальных закупок не существует** (`app/api/global-purchases/` отсутствует). Планируемый эндпоинт:

```
GET    /api/global-purchases           — список закупок (фильтрация: ?project_id=&status=&q=)
POST   /api/global-purchases           — создать позицию
GET    /api/global-purchases/[id]      — детали позиции
PATCH  /api/global-purchases/[id]      — обновить позицию
DELETE /api/global-purchases/[id]      — архивировать (soft delete)
POST   /api/global-purchases/import    — импорт из файла
GET    /api/global-purchases/export    — экспорт в файл
```

Текущий доступ к данным — **только через Supabase SDK** (прямые запросы с RLS-фильтрацией).

---

## 5. Компоненты

### 5.1 `GlobalPurchasesView` — обёртка

**Файл:** `features/global-purchases/global-purchases-details/components/global-purchases-view.tsx`

```tsx
export function GlobalPurchasesView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-500 p-1">
        <GlobalPurchasesSection />
      </div>
    </div>
  )
}
```

Минимальная обёртка: скроллируемый контейнер → `GlobalPurchasesSection`.

### 5.2 `GlobalPurchasesSection` — композиция списка

**Файл:** `features/global-purchases/global-purchases-details/components/global-purchases-section.tsx`

```tsx
export function GlobalPurchasesSection() {
  const { purchases, updateGlobalPurchase } = useGlobalPurchases()
  return (
    <section className="...">
      <div className="flex flex-col">
        {purchases.map((row) => (
          <GlobalPurchasesRow key={row.id} row={row} onUpdate={updateGlobalPurchase} />
        ))}
      </div>
    </section>
  )
}
```

Паттерн: хук → map → Row. Идентичен `PurchaseSection` из `features/purchases/`.

### 5.3 `GlobalPurchasesRow` — строка закупки

**Файл:** `features/global-purchases/global-purchases-details/components/global-purchases-row.tsx`

Самая насыщенная строка среди всех фич. Содержит три группы метрик в адаптивной сетке:

```
┌────────────────────────────────────────────────────────────────────┐
│ GlobalPurchasesRow                                                 │
│ ┌─────────────────────────┐ ┌──────────────────────────────────┐  │
│ │ GlobalPurchasesName     │ │ Стоимость       │ Параметры      │  │
│ │ • Наименование          │ │ • Кол-во (факт)  │ • Дата закупки │  │
│ │ • ед. изм               │ │ • Цена (факт)    │ • Поставщик    │  │
│ │                         │ │ • Сумма (факт)   │                │  │
│ └─────────────────────────┘ │                  │ Объект         │  │
│                             │                  │ • Объект       │  │
│                             └──────────────────┴────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

**Сетка:** `lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]` — название слева, метрики справа.

**Группа «Стоимость»:**
- `EditableBadge` (Кол-во) — фактическое количество, inline-редактирование
- `EditableBadge` (Цена) — фактическая цена (с форматированием `formatMoney`)
- `EditableBadge` (Сумма) — `factQuantity × factPrice`, только чтение (`strong`)

**Группа «Параметры»:**
- `Popover` → `Calendar` — выбор даты закупки
- `DropdownMenu` → список поставщиков («Поставщик 1/2/3», «Без поставщика»)

**Группа «Объект»:**
- `DropdownMenu` → выбор объекта/проекта («Объект А/Б/В», «Нет»)

**Расчёт отклонения:** `deviationTotal = planTotal - factTotal` — вычисляется в компоненте, но **не отображается** в текущей вёрстке.

**Локальное состояние:** `useState` для `selectedDate`, `selectedSupplier`, `selectedObject` (внутри строки, не в хуке).

### 5.4 `GlobalPurchasesName` — название позиции

**Файл:** `features/global-purchases/global-purchases-details/components/global-purchases-name.tsx`

Отображает наименование материала и единицу измерения в рамке:
- Заголовок «НАИМЕНОВАНИЕ» (uppercase, muted)
- Название (`text-sm font-medium`)
- Строка «ед. изм: {unit}» (muted)

**Отличие от `PurchaseName`:** не использует `Textarea` — только чтение. В сметах название редактируется на месте, в глобальных закупках — нет.

### 5.5 `GlobalPurchasesMetricGroup` — группа метрик

**Файл:** `features/global-purchases/global-purchases-details/components/global-purchases-metric-group.tsx`

```tsx
export function GlobalPurchasesMetricGroup({ children, title }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-dashed border-emerald-400 p-1.5">
      <div className="text-xs font-semibold text-muted-foreground uppercase">{title}</div>
      <div className="flex min-w-0 flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
```

Идентичен `EstimateMetricGroup` и `PurchaseMetricGroup` — общий паттерн для всех фич.

### 5.6 `GlobalPurchasesValue` — бейдж значения

**Файл:** `features/global-purchases/global-purchases-details/components/global-purchases-value.tsx`

```tsx
<Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums">
  <span className="text-muted-foreground">{label}:</span>
  <span>{value}</span>
</Badge>
```

Отличие от `EstimateValue`: **не форматирует числа** (нет вызова `formatMoney`). Значение отображается «как есть».

### 5.7 `GlobalPurchasesToolbar` — тулбар

**Файл:** `features/global-purchases/global-purchases-details/components/global-purchases-toolbar.tsx`

Самый функциональный тулбар среди всех фич. Состав:

| Элемент | Тип | Назначение |
|---|---|---|
| Поиск | `form` + `Input` | Поиск по закупкам, синхронизация `?q=` в URL |
| Импорт | `Button` | Кнопка импорта данных |
| Экспорт | `Button` | Кнопка экспорта данных |
| Закупка | `Button` | Создание новой позиции |
| Фильтр по объектам | `DropdownMenu` | «Все объекты», «Объект А/Б/В», «Без объекта» |
| Фильтр по дате | `Popover` → `Calendar` | Выбор даты закупки |

**Реализация поиска:**
```typescript
const handleSearch = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  const params = new URLSearchParams(searchParams.toString())
  // ...
  router.replace(nextSearch ? `?${nextSearch}` : window.location.pathname)
}
```

Синхронизация с `searchParams` через `useEffect` — при изменении URL-параметров поле ввода обновляется.

**Фильтрация:** кнопка `Funnel` открывает `DropdownMenu` с опциями фильтра по объектам. Кнопка `CalendarDots` открывает `Popover` с `Calendar` для фильтрации по дате.

**Состояние:** `filterObject` и `selectedDate` — локальный `useState` (фильтры **не синхронизированы с URL**, в отличие от поиска).

---

## 6. Хук `useGlobalPurchases`

**Файл:** `features/global-purchases/hooks/use-global-purchases.ts`

```typescript
export function useGlobalPurchases() {
  const [purchases, setPurchases] = useState(mockRows)

  const updateGlobalPurchase = (id: string, updates: Partial<GlobalPurchaseRow>) => {
    setPurchases((current) =>
      current.map((row) => (row.id === id ? { ...row, ...updates } : row))
    )
  }

  return { purchases, updateGlobalPurchase }
}
```

Минимальный хук: состояние из моков + функция обновления одной строки. При переходе на БД будет заменён на запросы к Supabase (с optimistic updates).

---

## 7. Импорт и экспорт

### 7.1 Текущее состояние

Кнопки «Импорт» и «Экспорт» присутствуют в тулбаре, но **логика не реализована** — кнопки являются заглушками без обработчиков `onClick`.

### 7.2 Планируемый механизм импорта

Ожидаемый поток импорта (по аналогии со справочниками):

```
1. Пользователь нажимает «Импорт» → открывается диалог выбора файла
2. Поддерживаемые форматы: .xlsx, .csv
3. Файл загружается на сервер (app/api/global-purchases/import)
4. Сервер парсит файл, валидирует строки
5. Создаётся запись в таблице импорта (аналог directory_material_import_jobs)
6. Строки импорта проходят валидацию и загружаются в global_purchases
7. Пользователь видит прогресс и результат
```

**Структура импортируемого файла (ожидаемая):**

| Колонка | Тип | Обязательное |
|---|---|---|
| Наименование | text | ✅ |
| Ед. изм | text | ✅ |
| Кол-во план | number | ✅ |
| Цена план | number | ✅ |
| Кол-во факт | number | ❌ |
| Цена факт | number | ❌ |
| Поставщик | text | ❌ |
| Проект | text | ❌ |
| Дата закупки | date | ❌ |
| Статус | enum | ❌ (default: planned) |
| Примечания | text | ❌ |

### 7.3 Планируемый механизм экспорта

```
1. Пользователь применяет фильтры (объект, дата, поиск)
2. Нажимает «Экспорт»
3. Сервер формирует файл с учётом текущих фильтров
4. Форматы: .xlsx, .csv
5. Файл скачивается через Content-Disposition: attachment
```

### 7.4 API-эндпоинты (план)

```
POST /api/global-purchases/import
  Content-Type: multipart/form-data
  Body: file (xlsx/csv)
  Response: { job_id, total_rows, status }

GET /api/global-purchases/export?format=xlsx&project_id=&status=&q=&date_from=&date_to=
  Response: file download
```

---

## 8. Tenant boundary (Multi-tenant изоляция)

### 8.1 Поле `workspace_owner_id`

Таблица `global_purchases` содержит `workspace_owner_id` (FK → `profiles.id`). RLS-политики:

```sql
-- Упрощённая RLS-политика
CREATE POLICY "workspace isolation" ON global_purchases
  FOR ALL USING (workspace_owner_id = auth.uid());
```

### 8.2 Денормализованные поля

Таблица использует денормализацию для удобства отображения:
- `supplier_name` (text) — дублирует `directory_suppliers.name` для быстрого доступа без JOIN
- `project_title` (text) — дублирует `projects.title` для быстрого доступа без JOIN
- `supplier_id` / `project_id` (uuid FK) — ссылки для целостности

При обновлении названия поставщика или проекта в справочнике требуется каскадное обновление денормализованных полей.

### 8.3 Проверка прав (RBAC)

Права на закупки определены в `types/roles.ts`:

| Право | owner | admin | manager | estimator | viewer |
|---|---|---|---|---|---|
| `purchases.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `purchases.create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `purchases.update` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `purchases.delete` | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 9. Связанные модули

| Модуль | Связь |
|---|---|
| `features/purchases/` | Закупки внутри сметы (вкладка) — аналогичная структура, но в контексте сметы |
| `features/projects/` | Привязка позиции к проекту (`project_id`) |
| `features/directory-suppliers/` | Привязка позиции к поставщику (`supplier_id`) |
| `lib/formatters.ts` | `formatMoney()`, `formatDate()`, `parseDecimalInput()` |
| `lib/calculations.ts` | `getTotal()` — план/факт суммы |
| `lib/auth/permissions.ts` | RBAC-проверки прав (`canManagePurchases` — планируется) |

---

## 10. Текущее состояние и план развития

| Этап | Статус |
|---|---|
| **БД-схема** | ✅ Готова (таблица `global_purchases` + индексы + RLS) |
| **Моки** | ✅ 10 позиций (бетон, арматура, кирпич, кабель, труба, краска, утеплитель, окна, двери, сантехника) |
| **UI-компоненты** | ✅ Полная декомпозиция (7 компонентов + хук + тулбар) |
| **Тулбар** | ✅ Поиск + фильтр по объектам + фильтр по дате + кнопки действий |
| **Inline-редактирование** | ✅ Количество и цена (EditableBadge) |
| **Выбор поставщика** | ✅ DropdownMenu с локальным состоянием (мок-список) |
| **Выбор объекта** | ✅ DropdownMenu с локальным состоянием (мок-список) |
| **Выбор даты** | ✅ Popover + Calendar |
| **Импорт** | ❌ Кнопка есть, логика отсутствует |
| **Экспорт** | ❌ Кнопка есть, логика отсутствует |
| **API Route Handlers** | ❌ Не реализованы |
| **Подключение к БД** | ❌ Хук использует моки |
| **Создание новой позиции** | ❌ Кнопка «Закупка» без обработчика |
| **Фильтрация по дате** | 🟡 UI готов, логика фильтрации отсутствует |
| **Синхронизация фильтров с URL** | 🟡 Только поиск (q=), фильтры объектов и дат — локальное состояние |
