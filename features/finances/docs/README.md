# Финансы (Finances)

Вкладка «Финансы» в карточке сметы. Отображает финансовую аналитику: KPI-карточки (Договор / Оплачено / Общий баланс / Закупки) и таблицу платежей с группировкой по разделам сметы.

---

## Структура

```
features/finances/
├── __mocks__/
│   └── finances.ts              # Моковые данные (используются как fallback при ошибке API)
├── api/
│   └── finances-client.ts       # API-клиент: GET/POST/PATCH/DELETE платежей (/api/.../payments)
├── lib/
│   ├── utils.ts                 # Бизнес-логика: getSectionFactAmount, getSectionStatus
│   ├── date-utils.ts            # Утилиты дат: toDateValue, toIsoDate, formatDisplayDate
│   └── finances-excel-exporter.ts  # Экспорт в Excel (ExcelJS, 8 колонок)
├── hooks/
│   └── use-finances.ts          # Хук React Query (useQuery + useMutation) — главный оркестратор
├── types.ts                     # Типы: PaymentStatus, SectionStatus, FinancePayment, FinanceSection
├── components/
│   ├── finances-view.tsx        # Основной view-компонент (KPI + таблица)
│   ├── finances-kpi-cards.tsx   # KPI-карточки (4 карточки)
│   └── payment-create-dialog.tsx # Диалог добавления/редактирования платежа
└── docs/
    └── README.md                # ← этот файл
```

---

## Состояние

- [x] Бэкенд-интеграция через Supabase (API Route Handlers + React Query)
- [x] KPI-шапка (Договор, Оплачено, Общий баланс, Закупки)
- [x] Таблица с expandable-строками (разделы → платежи)
- [x] Колонки: Раздел/Платёж · План · Факт · Затраты · Баланс · Статус · %
- [x] Статусы платежей: Проведён / В обработке / Отменён / Ожидается
- [x] Автостатус раздела: Оплачен / Частично / Не оплачен / Переплата
- [x] Оптимистичные UI-обновления (add / update / delete платежа)
- [x] Раздел «Общие авансы (вне этапов)» — виртуальный раздел для платежей без сметного раздела
- [x] Затраты на раздел = Факт выполнения работ + Факт закупок материалов данного раздела
- [x] Баланс раздела = Факт (платежи) − Затраты
- [x] Экспорт в Excel (8 колонок: Раздел/Дата/План/Факт/Затраты/Баланс/Статус/%)
- [x] Диалог добавления/редактирования платежа с выбором раздела, суммы и даты

---

## Данные

### Источники данных

| Данные | Откуда | Хук |
|---|---|---|
| Платежи | `/api/projects/[id]/estimate-records/[recordId]/payments` | `useFinances` → `fetchEstimatePayments` |
| Разделы сметы + работы + материалы | `useProjectEstimateContent` | вложено в `useFinances` |
| Закупки (факт материалов) | `/api/projects/[id]/estimate-records/[recordId]/purchases` | `useFinances` → `fetchEstimatePurchases` |

### Формула «Затраты» по разделу

```
затраты_раздела = сумма_факт_выполнения_работ + сумма_факт_закупок_материалов_раздела
```

- **Факт выполнения работ** — `work.factTotalAmount` из сметного содержания
- **Факт закупок материалов** — `purchase.factTotal` по закупкам, где `materialId` ∈ материалам данного раздела
- **Баланс** = Факт платежей − Затраты

### Виртуальный раздел «Общие авансы (вне этапов)»

Платежи без `sectionId` (или `sectionId === null`) группируются в этот раздел.  
Его затраты = закупки, не привязанные к конкретным разделам сметы.

---

## Типы

`features/finances/types.ts`:

| Тип | Описание |
|---|---|
| `PaymentStatus` | `"conducted" \| "processing" \| "cancelled" \| "expected"` |
| `SectionStatus` | `"paid" \| "partial" \| "unpaid" \| "overpaid"` |
| `FinancePayment` | paymentId, sectionId, date, amount, status, purpose, isPending?, isUpdating?, isDeleting? |
| `FinanceSection` | sectionId, title, planAmount, payments[], expenses?, balance? |

---

## Хук `use-finances.ts`

Главный оркестратор данных. Возвращает:

```ts
{
  sections: FinanceSection[]       // разделы сметы + виртуальный "Общие авансы"
  payments: FinancePayment[]       // все платежи сметы
  loading: boolean
  loadError: string | null
  refetch: () => Promise<void>
  addPayment: (payment) => void    // оптимистичное добавление
  updatePayment: (id, updates) => void  // оптимистичное обновление
  deletePayment: (id) => void      // оптимистичное удаление
  record: any                      // мета-данные сметы (название, адрес и т.д.)
  totalPurchasesAmount: number     // суммарный факт закупок по смете
}
```

Использует:
- `useProjectEstimateContent` — разделы + содержание сметы
- `useQuery` для платежей и закупок
- `useMutation` + оптимистичные обновления через `queryClient.setQueryData`

---

## Утилиты

### `lib/utils.ts`
- `getSectionFactAmount(section)` — сумма платежей со статусом `conducted` + `processing`
- `getSectionStatus(section)` — автостатус раздела (план vs факт)

### `lib/date-utils.ts`
- `toDateValue(iso)` — ISO-строка → Date (для Calendar)
- `toIsoDate(date)` — Date → ISO-строка (`YYYY-MM-DD`)
- `formatDisplayDate(iso)` — ISO-строка → локализованная дата (`ru-RU`)

### `lib/finances-excel-exporter.ts`
- `exportFinancesToExcel(content)` — генерирует и скачивает `.xlsx`

**Структура Excel (8 колонок):**

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Раздел / Платёж | Дата | План | Факт | Затраты | Баланс | Статус | % |

- Строки-разделы содержат формулы SUMPRODUCT (фильтрация по статусу «Проведён» / «В обработке»)
- Вложенные строки платежей — плоские данные
- Итоговая строка «ИТОГО ПО СМЕТЕ» — суммарные формулы
- Формула баланса: `=N(D) - N(E)`

---

## Компоненты

### `FinancesKpiCards`

4 карточки над таблицей:

| Карточка | Формула |
|---|---|
| Договор | Сумма `planAmount` всех разделов (кроме `general_advance`) |
| Оплачено | Сумма всех проведённых платежей |
| Общий баланс | Сумма `balance` по всем разделам (Факт − Затраты) |
| Закупки | `totalPurchasesAmount` (суммарный факт из таба закупок) |

### `FinancesView`

Главный компонент страницы. Принимает `projectId`, `estimateId`.

- Вызывает `useFinances(projectId, estimateId)`
- Рендерит `FinancesKpiCards` + таблицу с expandable-строками
- Обрабатывает toolbar-события: `project-finances:add-payment`, `project-finances:export`
- Экспорт вызывает `exportFinancesToExcel` с данными `sections + record + totalPurchasesAmount`

### Expandable Table

Колонки:

| # | Название | Строка-раздел | Строка-платёж |
|---|---|---|---|
| 1 | Раздел / Платёж | Название раздела | Назначение + дата |
| 2 | План | `planAmount` | — |
| 3 | Факт | Сумма платежей (conducted + processing) | Сумма платежа |
| 4 | Затраты | `expenses` (работы + закупки) | — |
| 5 | Баланс | `balance` = факт − затраты | Статус платежа |
| 6 | % | факт / план × 100 | Действия (Edit / Delete) |

### `PaymentCreateDialog`

Диалог добавления и редактирования платежа. Поля: раздел, назначение, сумма, дата, статус.

---

## События тулбара

| Событие | Действие |
|---|---|
| `project-finances:add-payment` | Открывает диалог добавления платежа |
| `project-finances:export` | Вызывает `exportFinancesToExcel` → скачивание `.xlsx` |

---

## Страница

`app/(main)/projects/[projectId]/estimates/[estimateId]/finances/page.tsx`  
Серверный компонент. Читает `params`, передаёт `projectId` + `estimateId` в `FinancesView`.  
Оборачивает в `<Suspense>` со скелетоном.
