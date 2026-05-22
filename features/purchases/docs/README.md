# Закупки сметы (purchases)

> 2026-05-22 · статус: mock (фронтенд), БД и API не реализованы

---

## 1. Назначение

Модуль `purchases` — **вкладка «Закупки» сметы**, отображающая план-фактный анализ закупок материалов для конкретной сметы. Сравнивает плановые показатели (из сметы) с фактическими (по данным закупок) и рассчитывает отклонения.

Вкладка доступна из интерфейса сметы:
```
Смета → [Состав] [Закупки] [Исполнение] [Финансы] [Документы]
                 ^^^^^^^^^
```

На момент 2026-05-22 модуль работает **только с мок-данными** — не подключён к базе данных. Все значения отображаются статически (без inline-редактирования).

### Отличие от глобальных закупок

| Характеристика | `features/purchases/` | `features/global-purchases/` |
|---|---|---|
| **Контекст** | Внутри конкретной сметы | Уровень workspace (все проекты) |
| **Данные** | Только чтение (статические бейджи) | Inline-редактирование (EditableBadge) |
| **Тулбар** | Общий для всех вкладок сметы | Собственный (поиск + фильтры + действия) |
| **Ед. измерения** | Нет поля `unit` в данных | Есть поле `unit` |
| **Доп. поля** | Нет | Поставщик, объект, дата закупки |
| **Роутинг** | `/projects/:pid/estimates/:eid/purchases` | `/procurements` |

---

## 2. Структура модуля

```
features/purchases/
├── __mocks__/
│   └── purchases.ts                              # Мок-данные: 10 строк закупок
├── hooks/
│   └── use-purchases.ts                          # Хук (только чтение из моков)
├── components/
│   └── purchases-view.tsx                        # Обёртка со скроллом
└── purchase-details/
    └── components/
        ├── purchase-section.tsx                   # Композиция списка (хук → map → Row)
        ├── purchase-row.tsx                       # Строка закупки (план/факт/отклонение)
        ├── purchase-name.tsx                      # Название материала
        ├── purchase-value.tsx                     # Бейдж «label: value»
        └── purchase-metric-group.tsx              # Группа метрик с заголовком
```

### Роутинг

```
app/(main)/projects/[projectId]/estimates/[estimateId]/purchases/page.tsx
```

Страница рендерит `<PurchasesView />` (из `features/purchases/components/purchases-view.tsx`).

### Типы данных

```typescript
// types/purchase.ts
export type PurchaseRow = {
  id: string
  title: string           // Наименование материала
  planQuantity: number    // Плановое количество
  planPrice: number       // Плановая цена
  factQuantity: number    // Фактическое количество
  factPrice: number       // Фактическая цена
}
```

**Отличие от `ExecutionRow`:** `PurchaseRow` **не содержит** поле `unit` — единица измерения не предусмотрена в данных закупок сметы. Название материала отображается одной строкой без указания единицы измерения.

---

## 3. Компоненты

### 3.1 `PurchasesView` — обёртка

**Файл:** `features/purchases/components/purchases-view.tsx`

```tsx
export function PurchasesView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-500 p-1">
        <PurchaseSection />
      </div>
    </div>
  )
}
```

Идентичен `ExecutionView` по структуре. Рамка `border-red-500` визуально выделяет зону вкладки.

### 3.2 `PurchaseSection` — композиция списка

**Файл:** `features/purchases/purchase-details/components/purchase-section.tsx`

```tsx
export function PurchaseSection() {
  const { purchases } = usePurchases()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {purchases.map((row) => (
          <PurchaseRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
```

**Важное отличие от `ExecutionSection`:** не передаёт `onUpdate` в строки — все данные **только для чтения**.

### 3.3 `PurchaseRow` — строка закупки

**Файл:** `features/purchases/purchase-details/components/purchase-row.tsx`

Строка только для чтения — все значения отображаются через `PurchaseValue` (статический `Badge`).

**Сетка:** `lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]` — идентична `ExecutionRow`.

**Три группы метрик:**

| Группа | Поля | Тип компонента |
|---|---|---|
| **План** | Кол-во, Цена, Итого | `PurchaseValue` (Badge, readonly) |
| **Факт** | Кол-во, Цена, Итого | `PurchaseValue` (Badge, readonly) |
| **Отклонение** | Итого | `PurchaseValue` (Badge, readonly) |

**Расчёт итогов:**

```typescript
const planTotal = getTotal(row.planQuantity, row.planPrice)
const factTotal = getTotal(row.factQuantity, row.factPrice)
const deviationTotal = planTotal - factTotal
```

**Форматирование:** цена и итоги форматируются через `formatMoney()` **перед передачей** в `PurchaseValue` (в отличие от `ExecutionValue`, где форматирование происходит внутри через `formatDisplay`).

**Визуальное отличие от `ExecutionRow`:**
- `ExecutionRow` использует `EditableBadge` для плана и факта → можно редактировать на месте
- `PurchaseRow` использует статические `PurchaseValue` (Badge) → только просмотр

### 3.4 `PurchaseName` — название материала

**Файл:** `features/purchases/purchase-details/components/purchase-name.tsx`

```tsx
export function PurchaseName({ value }: { value: string }) {
  return (
    <div className="...">
      <span className="...uppercase">Name</span>
      <div className="...">{value}</div>
    </div>
  )
}
```

**Отличие от `ExecutionName`:** не отображает единицу измерения (нет пропса `unit`). Название материала может включать полное описание (например, «Автоматический выключатель EKF PROxima BA-45-2000 3P 1000A 80 кА 690 В»).

### 3.5 `PurchaseValue` — бейдж значения

**Файл:** `features/purchases/purchase-details/components/purchase-value.tsx`

```tsx
<Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums">
  <span className="text-muted-foreground">{label}:</span>
  <span>{value}</span>
</Badge>
```

Идентичен `ExecutionValue` и `EstimateValue`. Поддерживает `strong` для жирного шрифта. Значение передаётся уже отформатированным (строка).

### 3.6 `PurchaseMetricGroup` — группа метрик

**Файл:** `features/purchases/purchase-details/components/purchase-metric-group.tsx`

Идентичен `ExecutionMetricGroup` и `EstimateMetricGroup` — группировка метрик с uppercase-заголовком в рамке `border-emerald-400`.

---

## 4. Хук `usePurchases`

**Файл:** `features/purchases/hooks/use-purchases.ts`

```typescript
export function usePurchases() {
  return { purchases: purchaseRows }
}
```

**Крайне минимальный хук:**
- Нет `useState` — возвращает статический массив из моков
- Нет `updatePurchase` — данные не редактируются
- Отличие от `useExecution`: там есть `useState` и `updateExecution`, здесь — чистый импорт

---

## 5. Мок-данные

**Файл:** `features/purchases/__mocks__/purchases.ts`

10 строк электротехнических материалов:

| ID | Материал | План (кол-во) | План (цена) | Факт (кол-во) | Факт (цена) |
|---|---|---|---|---|---|
| purchase-1 | Автоматический выключатель EKF PROxima BA-45-2000 3P 1000A 80 кА 690 В | 0 | 0 | 1 | 355 784 |
| purchase-2 | Кабель ВВГнг-LS 5x10 | 120 | 680 | 118 | 720 |
| purchase-3 | Лоток металлический перфорированный 100x50 | 34 | 1 250 | 36 | 1 190 |
| purchase-4 | Розетка силовая промышленная 32А | 18 | 2 400 | 18 | 2 630 |
| purchase-5 | Щит распределительный навесной IP54 | 4 | 18 500 | 5 | 17 900 |
| purchase-6 | DIN-рейка оцинкованная 35 мм | 45 | 180 | 45 | 176 |
| purchase-7 | Автоматический выключатель 1P 16А | 96 | 420 | 100 | 415 |
| purchase-8 | Клемма проходная винтовая 4 мм2 | 320 | 48 | 300 | 52 |
| purchase-9 | Труба гофрированная ПВХ 25 мм | 250 | 38 | 260 | 41 |
| purchase-10 | Маркировочная бирка кабельная | 1 000 | 6 | 1 200 | 5 |

Цены в рублях. Интересный кейс: `purchase-1` имеет план 0/0 — позиция добавлена только по факту (незапланированная закупка).

---

## 6. Tenant boundary

Модуль `purchases` **не имеет собственных таблиц в БД** — все данные приходят через моки. Tenant-изоляция будет обеспечена при реализации:

- Таблица (планируется) будет содержать `workspace_owner_id` с RLS-политикой
- Закупки будут привязаны к `project_estimate_materials.id` или `project_estimate_records.id`
- План-факт сравнение может опираться на существующие таблицы сметы:
  - План: `project_estimate_materials.quantity` × `project_estimate_materials.price`
  - Факт: новая таблица `project_estimate_purchases`

---

## 7. Текущие ограничения

| Ограничение | Детали |
|---|---|
| **Только моки** | Все данные из `__mocks__/purchases.ts`, нет подключения к БД |
| **Только чтение** | `usePurchases` не поддерживает обновление — все значения статические |
| **Нет таблицы в БД** | Схема для закупок сметы не создана |
| **Нет API** | Отсутствуют RPC-функции и Route Handlers |
| **Нет связи со сметой** | Мок-данные не привязаны к `estimateId` |
| **Нет единиц измерения** | Тип `PurchaseRow` не содержит поле `unit` |
| **Хук без состояния** | В отличие от `useExecution`, хук `usePurchases` не использует `useState` — возвращает статический импорт |
| **Нет фильтрации/поиска** | Тулбар общий для всех вкладок сметы, специфичного для закупок нет |
| **Форматирование на уровне Row** | `formatMoney()` вызывается в `PurchaseRow`, а не в `PurchaseValue` — неконсистентно с `ExecutionValue` (где форматирование внутри) |
| **Компоненты дублируются** | `PurchaseValue`, `PurchaseMetricGroup` структурно идентичны `ExecutionValue`, `ExecutionMetricGroup` — кандидаты на вынос в shared |
| **Нет пагинации** | Все 10 строк рендерятся сразу |
| **purchase-1 имеет план 0** | Мок содержит кейс с нулевыми плановыми значениями — неясно, предусмотрена ли обработка таких случаев в UI |
