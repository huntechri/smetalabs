# Выполнение (execution)

> 2026-05-22 · статус: mock (фронтенд), БД и API не реализованы

---

## 1. Назначение

Модуль `execution` — **вкладка «Выполнение» сметы**, отображающая план-фактный анализ выполненных работ. Сравнивает плановые показатели (из сметы) с фактическими (по данным выполнения) и рассчитывает отклонения.

Вкладка доступна из интерфейса сметы:
```
Смета → [Состав] [Закупки] [Исполнение] [Финансы] [Документы]
                        ^^^^^^^^^^^^
```

На момент 2026-05-22 модуль работает **только с мок-данными** — не подключён к базе данных.

---

## 2. Структура модуля

```
features/execution/
├── __mocks__/
│   └── execution.ts                              # Мок-данные: 10 строк выполнения
├── hooks/
│   └── use-execution.ts                          # Хук состояния (useState из моков)
├── components/
│   └── execution-view.tsx                         # Обёртка со скроллом
└── execution-details/
    └── components/
        ├── execution-section.tsx                  # Композиция списка (хук → map → Row)
        ├── execution-row.tsx                      # Строка выполнения (план/факт/отклонение)
        ├── execution-name.tsx                     # Название работы + ед. изм
        ├── execution-value.tsx                    # Бейдж «label: value»
        └── execution-metric-group.tsx             # Группа метрик с заголовком
```

### Роутинг

```
app/(main)/projects/[projectId]/estimates/[estimateId]/execution/page.tsx
```

Страница рендерит `<ExecutionView />` (из `features/execution/components/execution-view.tsx`).

### Типы данных

```typescript
// types/execution.ts
export type ExecutionRow = {
  id: string
  title: string           // Название работы
  unit: string            // Единица измерения
  planQuantity: number    // Плановое количество
  planPrice: number       // Плановая цена
  factQuantity: number    // Фактическое количество
  factPrice: number       // Фактическая цена
}
```

**Отличие от `PurchaseRow`:** `ExecutionRow` содержит поле `unit` (единица измерения), в то время как `PurchaseRow` — нет. Это связано с тем, что в закупках единица измерения отображается в отдельном компоненте `PurchaseName` статически, а в выполнении — динамически через `ExecutionName`.

---

## 3. Компоненты

### 3.1 `ExecutionView` — обёртка

**Файл:** `features/execution/components/execution-view.tsx`

```tsx
export function ExecutionView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-500 p-1">
        <ExecutionSection />
      </div>
    </div>
  )
}
```

Минимальная обёртка: flex-контейнер с кастомным скроллбаром → `ExecutionSection`. Рамка `border-red-500` визуально выделяет зону вкладки (dashed-border — отладочный стиль).

### 3.2 `ExecutionSection` — композиция списка

**Файл:** `features/execution/execution-details/components/execution-section.tsx`

```tsx
export function ExecutionSection() {
  const { executions, updateExecution } = useExecution()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {executions.map((row) => (
          <ExecutionRow key={row.id} row={row} onUpdate={updateExecution} />
        ))}
      </div>
    </section>
  )
}
```

Паттерн: хук → map → Row. Секция в карточке (`bg-card`, `shadow-sm`).

### 3.3 `ExecutionRow` — строка выполнения

**Файл:** `features/execution/execution-details/components/execution-row.tsx`

Самая функциональная строка — поддерживает **inline-редактирование** всех числовых полей через `EditableBadge`.

**Сетка:** `lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]` — название слева, метрики справа.

**Три группы метрик:**

| Группа | Поля | Редактирование |
|---|---|---|
| **План** | Кол-во (`EditableBadge`), Цена (`EditableBadge`), Итого (`Badge`, readonly) | ✅ Кол-во и Цена |
| **Факт** | Кол-во (`EditableBadge`), Цена (`EditableBadge`), Итого (`Badge`, readonly) | ✅ Кол-во и Цена |
| **Отклонение** | Итого (`Badge`, readonly) | ❌ Автовычисление |

**Расчёт итогов:**

```typescript
const planTotal = getTotal(row.planQuantity, row.planPrice)     // quantity × price
const factTotal = getTotal(row.factQuantity, row.factPrice)     // quantity × price
const deviationTotal = planTotal - factTotal                    // план − факт
```

**Форматирование:** все денежные значения форматируются через `formatMoney()`.

**Стиль:** строки разделены `border-b border-dashed border-green-500`, последняя строка без разделителя (`last:border-b-0`). Ховер: `hover:bg-muted/50`.

### 3.4 `ExecutionName` — название работы

**Файл:** `features/execution/execution-details/components/execution-name.tsx`

```tsx
export function ExecutionName({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="...">
      <span className="...uppercase">Name</span>
      <div className="...">{value}</div>
      <span className="...">ед. изм: {unit}</span>
    </div>
  )
}
```

Отображает название работы и единицу измерения в рамке `border-green-300`. Только чтение (в отличие от `EstimateName`, который использует `Textarea`).

### 3.5 `ExecutionValue` — бейдж значения

**Файл:** `features/execution/execution-details/components/execution-value.tsx`

```tsx
<Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums">
  <span className="text-muted-foreground">{label}:</span>
  <span>{value}</span>
</Badge>
```

Идентичен `PurchaseValue` и `EstimateValue` (через `Badge` из shadcn/ui). Поддерживает `strong` для жирного шрифта.

### 3.6 `ExecutionMetricGroup` — группа метрик

**Файл:** `features/execution/execution-details/components/execution-metric-group.tsx`

```tsx
export function ExecutionMetricGroup({ children, title }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-dashed border-emerald-400 p-1.5">
      <div className="text-xs font-semibold text-muted-foreground uppercase">{title}</div>
      <div className="flex min-w-0 flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
```

Идентичен `PurchaseMetricGroup` и `EstimateMetricGroup` — общий паттерн группировки с заголовком.

---

## 4. Хук `useExecution`

**Файл:** `features/execution/hooks/use-execution.ts`

```typescript
export function useExecution() {
  const [executions, setExecutions] = useState(mockRows)

  const updateExecution = (id: string, updates: Partial<ExecutionRow>) => {
    setExecutions((current) =>
      current.map((row) => (row.id === id ? { ...row, ...updates } : row))
    )
  }

  return { executions, updateExecution }
}
```

**Особенности:**
- Инициализируется из моков (`executionRows` из `__mocks__/execution.ts`)
- Поддерживает частичное обновление одной строки (`Partial<ExecutionRow>`)
- При переходе на БД будет заменён на запросы к Supabase

---

## 5. Мок-данные

**Файл:** `features/execution/__mocks__/execution.ts`

10 строк строительных работ, имитирующих реальные данные:

| ID | Работа | Ед. изм | План (кол-во) | План (цена) | Факт (кол-во) | Факт (цена) |
|---|---|---|---|---|---|---|
| exec-1 | Монтаж перегородки из ГКЛ | м² | 245 | 850 | 230 | 920 |
| exec-2 | Шпаклевка стен | м² | 1200 | 320 | 1180 | 340 |
| exec-3 | Электромонтаж | точка | 64 | 1800 | 68 | 1750 |
| exec-4 | Укладка плитки | м² | 180 | 1200 | 175 | 1280 |
| exec-5 | Малярные работы | м² | 950 | 280 | 960 | 265 |
| exec-6 | Прокладка кабеля | м | 420 | 150 | 435 | 148 |
| exec-7 | Монтаж подвесного потолка | м² | 320 | 950 | 310 | 1000 |
| exec-8 | Установка дверей | шт | 24 | 4500 | 24 | 4700 |
| exec-9 | Монтаж вентиляции | м² | 85 | 2100 | 90 | 2050 |
| exec-10 | Сантехнические работы | точка | 48 | 2800 | 52 | 2750 |

Цены в рублях. Данные показывают характерные отклонения: перерасход по цене (exec-1, exec-7, exec-8), экономия (exec-3, exec-5, exec-10), точное совпадение количества (exec-8).

---

## 6. Tenant boundary

Модуль `execution` **не имеет собственных таблиц в БД** — все данные приходят через моки. Tenant-изоляция будет обеспечена при реализации:

- Таблица (планируется) будет содержать `workspace_owner_id` с RLS-политикой
- Работы будут привязаны к `project_estimate_works.id` (существующая таблица уже имеет tenant-изоляцию)
- Фактические данные выполнения будут храниться в новой таблице (например, `project_estimate_work_executions`)

---

## 7. Текущие ограничения

| Ограничение | Детали |
|---|---|
| **Только моки** | Все данные из `__mocks__/execution.ts`, нет подключения к БД |
| **Нет таблицы в БД** | Схема для выполнения не создана — таблицы `project_estimate_works` недостаточно для хранения факта |
| **Нет API** | Отсутствуют RPC-функции и Route Handlers для CRUD операций |
| **Нет связи со сметой** | Мок-данные не привязаны к `estimateId` — все сметы показывают одинаковые 10 строк |
| **Нет optimistic updates** | `useExecution` использует простой `useState`, без связи с сервером |
| **Нет фильтрации/поиска** | В отличие от других модулей, во вкладке «Выполнение» нет тулбара с поиском |
| **Нет пагинации** | Все 10 строк рендерятся сразу |
| **Нет группировки по разделам** | Строки выводятся плоским списком, без привязки к разделам сметы |
| **Нет статусов выполнения** | Нет поля `status` (начато/завершено/проблема) |
| **Компоненты дублируются** | `ExecutionValue`, `ExecutionMetricGroup` структурно идентичны `PurchaseValue`, `PurchaseMetricGroup` — кандидаты на вынос в shared |
