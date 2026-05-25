# Финансы (Finances)

Вкладка «Финансы» в карточке сметы. Отображает финансовую аналитику: общие KPI (договор, оплачено, остаток, % готовности) и таблицу платежей с группировкой по разделам сметы.

## Структура

```
features/finances/
├── __mocks__/
│   └── finances.ts              # Моковые данные: разделы + платежи (7 разделов, включая overpaid)
├── lib/
│   ├── utils.ts                 # Бизнес-логика: getSectionFactAmount, getSectionStatus
│   └── date-utils.ts            # Утилиты дат: toDateValue, toIsoDate, formatDisplayDate
├── types.ts                     # Типы: PaymentStatus, SectionStatus, FinancePayment, FinanceSection
├── components/
│   ├── finances-view.tsx        # Основной view-компонент (KPI + таблица)
│   ├── finances-kpi-cards.tsx   # KPI-карточки (4 карточки)
│   └── payment-create-dialog.tsx # Диалог добавления платежа (Calendar + Popover)
├── docs/
│   └── README.md                # ← этот файл
```

## Состояние

- [x] Прототип на моках (7 разделов сметы, включая сценарий переплаты, 12+ платежей)
- [x] KPI-шапка (Договор, Оплачено, Остаток, % готовности)
- [x] Таблица с expandable-строками (разделы → платежи)
- [x] Статусы платежей: проведён / в обработке / отменён / ожидается
- [x] Автостатус раздела: оплачен / частично / не оплачен / переплата
- [x] Кнопка «Платёж» в тулбаре открывает диалог через `searchParams` (`?dialog=add-payment`)
- [x] Кнопка «Экспорт» в тулбаре диспатчит событие `project-finances:export` (заглушка, слушатель не реализован)
- [x] Диалог добавления платежа (PaymentCreateDialog: календарь выбора даты + Popover)
- [ ] Интеграция с бэкендом (API Routes + Supabase)

## Данные (моки)

Моковые данные лежат в `__mocks__/finances.ts` и включают:
- `FinanceSection` — раздел сметы (sectionId, title, planAmount, payments[])
- `FinancePayment` — платёж (paymentId, sectionId, date, amount, status, purpose)
- Сценарий переплаты (раздел 7: факт > план)

## Типы

`features/finances/types.ts`:
- `PaymentStatus` — `"conducted" | "processing" | "cancelled" | "expected"`
- `SectionStatus` — `"paid" | "partial" | "unpaid" | "overpaid"`
- `FinancePayment` — интерфейс платежа
- `FinanceSection` — интерфейс раздела сметы

## Утилиты

### `lib/utils.ts`
- `getSectionFactAmount()` — вычисляет сумму проведённых платежей (conducted + processing)
- `getSectionStatus()` — определяет автостатус раздела (план vs факт)

### `lib/date-utils.ts`
- `toDateValue(iso: string | null)` — ISO-строка → Date для Calendar
- `toIsoDate(date: Date | undefined)` — Date → ISO-строка (YYYY-MM-DD)
- `formatDisplayDate(iso: string)` — ISO-строка → ru-RU для отображения

## Компоненты

### FinancesKpiCards

4 карточки над таблицей:
- **Договор** — общая сумма сметы по всем разделам
- **Оплачено** — сумма всех проведённых платежей
- **Остаток** — договор − оплачено
- **Готовность** — (оплачено / договор) × 100%

### FinancesView

Основной компонент страницы. Получает `projectId` и `estimateId` через пропсы
(зарезервированы для будущих API-запросов).
- Рендерит `FinancesKpiCards` + таблицу с expandable-строками
- Кнопка «Платёж» снизу (дублирует тулбарную) — для быстрого доступа

### Expandable Table

- **Строка-группа** (раздел): название, план, факт, остаток, %, статус
- **Вложенные строки** (платежи): дата, сумма, статус, назначение
- Клик по строке раздела — раскрывает/скрывает платежи
- Пустой раздел без платежей → «Платежей пока нет»

## События тулбара

| Событие | Описание |
|---|---|
| `project-finances:add-payment` | Кнопка «Платёж» (пока alert-заглушка) |
| `project-finances:export` | Кнопка «Экспорт» (пока alert-заглушка) |

## Страница

`app/(main)/projects/[projectId]/estimates/[estimateId]/finances/page.tsx` — серверный компонент с Suspense + Skeleton (таблица из 5 колонок).
