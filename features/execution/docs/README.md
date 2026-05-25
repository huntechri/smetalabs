# Выполнение (execution)

> 2026-05-25 · статус: production (интегрировано с БД и API)

---

## 1. Назначение

Модуль `execution` — **вкладка «Исполнение» сметы**, отображающая план-фактный анализ выполненных работ. Сравнивает плановые показатели (из сметы) с фактическими (по данным выполнения) и рассчитывает отклонения.

Вкладка доступна из интерфейса сметы:
```
Смета → [Состав] [Закупки] [Исполнение] [Финансы] [Документы]
                        ^^^^^^^^^^^^
```

Модуль полностью подключен к базе данных PostgreSQL через Drizzle ORM/Supabase API и работает с реальными данными сметы.

---

## 2. Структура модуля

```
features/execution/
├── hooks/
│   └── use-execution.ts                          # [УСТАРЕЛО] Использовался для локальных моков
├── components/
│   └── execution-view.tsx                         # Основной компонент-контейнер вкладки
└── execution-details/
    └── components/
        ├── execution-section-card.tsx             # Раздел сметы (группировка работ)
        ├── execution-row.tsx                      # Строка выполнения (план/факт/отклонение)
        ├── execution-name.tsx                     # Название работы
        ├── execution-value.tsx                    # Компонент для вывода значений (Badge)
        ├── execution-metric-group.tsx             # Группа метрик с заголовком
        ├── execution-unit.tsx                     # Ед. изм работы
        └── create-work-dialog.tsx                 # Диалог создания дополнительной работы
```

### Роутинг

```
app/(main)/projects/[projectId]/estimates/[estimateId]/execution/page.tsx
```

Страница рендерит `<ExecutionView />`, передавая `projectId` и `estimateId`.

### Типы данных

Поля добавлены непосредственно в основную модель работы сметы `ProjectEstimateContentWork`:
```typescript
// types/project-estimate-content.ts
export type ProjectEstimateContentWork = {
  id: string
  sectionId: string
  number: string
  code: string | null
  title: string
  unitCode: string
  unitLabel: string
  quantity: number        // Плановое количество
  price: number           // Плановая цена
  totalAmount: number     // Плановое итого (quantity * price)
  factQuantity: number    // Фактическое количество (по умолчанию 0)
  factPrice: number       // Фактическая цена (по умолчанию 0)
  factTotalAmount: number // Фактическое итого (factQuantity * factPrice)
  ...
}
```

---

## 3. Логика работы

### 3.1 `ExecutionView` — общая контейнерная панель
Загружает данные сметы с помощью хука `useProjectEstimateContent(projectId, estimateId)`. Поддерживает:
* **Поиск:** фильтрация по тексту запроса из поисковой строки тулбара (с использованием `deferredSearch`).
* **Добавление дополнительных работ:** ловит глобальное событие `project-execution:add-work` от кнопки «+ Доп. работа» панели инструментов и открывает диалоговое окно `CreateWorkDialog`. Работа создается в первом доступном разделе сметы (или автоматически создается технический раздел «Без раздела»).

### 3.2 `ExecutionSectionCard` — группировка по разделам
Группирует работы по разделам сметы с сохранением порядка сортировки (`sortOrder`) точно так же, как во вкладке «Состав».
* Отображает общие агрегаты раздела:
  * **План:** Сумма `totalAmount` всех работ раздела.
  * **Факт:** Сумма `factTotalAmount` всех работ раздела.
  * **Отклонение:** Разница План − Факт.
* Обладает складным контейнером (`Collapsible`).

### 3.3 `ExecutionRow` — строка выполнения
* **План:** Отображает плановое количество, плановую цену и итого сметы. Эти поля не редактируются из вкладки «Исполнение» (они фиксируются в смете).
* **Факт:** Позволяет вводить фактическое количество и фактическую цену вручную через инлайн-поля ввода (`EditableBadge`). При вводе данные сохраняются в БД. По умолчанию равны `0`.
* **Отклонение:** Рассчитывает отклонение по формуле `План (Итого) - Факт (Итого)`. Бейдж отклонения окрашивается в зависимости от результата:
  * Зеленый (emerald) — при экономии (План > Факт).
  * Красный (red) — при перерасходе (План < Fact).
  * Серый/без рамки — при равенстве.

---

## 4. Интеграция с базой данных (DDL)

Поля добавлены в таблицу `project_estimate_works`:
```sql
ALTER TABLE public.project_estimate_works
  ADD COLUMN fact_quantity numeric(14, 3) NOT NULL DEFAULT 0,
  ADD COLUMN fact_price numeric(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.project_estimate_works
  ADD CONSTRAINT chk_project_estimate_works_fact_quantity_non_negative CHECK (fact_quantity >= 0),
  ADD CONSTRAINT chk_project_estimate_works_fact_price_non_negative CHECK (fact_price >= 0);
```
