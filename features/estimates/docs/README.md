# Модуль «Сметы» (Estimates)

> 2026-05-22 · статус: вёрстка + моки (фронтенд), БД-схема готова, API частично (RPC)

---

## 1. Назначение

Модуль «Сметы» отвечает за создание, редактирование и просмотр смет в рамках проекта. Смета — иерархическая структура: **запись сметы** → **разделы** → **работы** → **материалы**. Каждая смета привязана к проекту и workspace-владельцу (multi-tenant).

### Ключевые возможности (реализованные и планируемые)

- Создание разделов сметы (диалог `CreateSectionDialog`)
- Добавление работ и материалов из справочников
- Редактирование количества, цены, названий на месте (inline editing через `EditableBadge`)
- Расчёт итоговых сумм (работа = кол-во × цена, итого по разделу = Σ работ + Σ материалов)
- Collapsible-дерево: разделы → работы → материалы
- Drag & drop реордеринг разделов/работ/материалов (RPC-функции в БД)
- Коэффициенты на работы (поле `works_coefficient_percent`)
- Вкладки: Состав, Закупки, Исполнение, Финансы, Документы

---

## 2. Структура модуля

```
features/estimates/
├── __mocks__/
│   └── estimates.ts                    # Мок-данные: 2 работы с 5 материалами, этапы
├── components/
│   └── estimate-navigation-tabs.tsx    # Табы навигации по вкладкам сметы (5 вкладок)
├── hooks/
│   └── use-estimates.ts               # Хук состояния: workRows, totals, toggle/update
├── estimate-details/
│   └── components/
│       ├── estimate-section.tsx        # Композиция раздела (Collapsible + список работ + итоги)
│       ├── estimate-row.tsx            # Строка работы (Collapsible + метрики + карточки материалов)
│       ├── estimate-name.tsx           # Поле названия работы (Textarea)
│       ├── estimate-value.tsx          # Бейдж «label: value» (Badge из shadcn/ui)
│       ├── estimate-metric-group.tsx   # Группа метрик с заголовком
│       ├── estimate-material-card.tsx  # Карточка материала (Card + EditableBadge)
│       ├── estimate-material-name.tsx  # Поле названия материала (Textarea)
│       ├── estimate-material-actions.tsx # DropdownMenu материала (Редактировать/Дублировать/Удалить)
│       ├── estimate-work-number.tsx    # Номер работы (№ + value)
│       ├── estimate-work-actions.tsx   # Кнопки действий работы (Pencil/Copy/Gear)
│       ├── estimate-summary-value.tsx  # Сводный итог по разделу (label + форматированная сумма)
│       ├── create-section-dialog.tsx   # Диалог создания раздела (№ + название)
│       └── estimate-empty-state.tsx    # Пустое состояние (до создания первого раздела)
└── estimate-tabs/
    └── components/
        ├── estimate-tab-toolbar.tsx    # Тулбар вкладки (поиск + кнопки: Импорт/Экспорт/Коэффициент)
        └── estimate-tab-placeholder.tsx # Заглушка для нереализованных вкладок
```

### Роутинг (App Router)

```
app/(main)/projects/[projectId]/estimates/[estimateId]/
├── layout.tsx                           # Layout сметы: EstimateNavigationTabs + EstimateTabToolbar
├── page.tsx                             # Вкладка «Состав» (EstimateSection / EstimateEmptyState)
├── documents/page.tsx                   # Вкладка «Документы» (EstimateTabPlaceholder)
├── execution/page.tsx                   # Вкладка «Выполнение» (ExecutionView из features/execution)
├── finances/page.tsx                    # Вкладка «Финансы» (EstimateTabPlaceholder)
└── purchases/page.tsx                   # Вкладка «Закупки» (PurchasesView из features/purchases)
```

### Типы данных

```typescript
// types/estimate.ts
export type Material = {
  id: string
  title: string
  unit: string
  quantity: number
  waste: number
  price: number
}

export type Work = {
  id: string
  number: string
  title: string
  unit: string
  quantity: number
  price: number
  materials: Material[]
}
```

---

## 3. Таблицы базы данных

Три основные таблицы в схеме `public`, все с включённым RLS.

### 3.1 `project_estimate_records` — записи смет (3 записи)

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор сметы |
| `workspace_owner_id` | uuid FK → profiles.id | Multi-tenant изоляция |
| `project_id` | uuid FK → projects.id | Привязка к проекту |
| `name` / `normalized_name` | text NOT NULL | Название (и нормализованное для дедупликации) |
| `type` | text, default `'Основная'` | Тип сметы |
| `status` | enum: `new`, `in_progress`, `completed` | Статус |
| `amount` | numeric ≥ 0, default `0` | Итоговая сумма сметы |
| `works_coefficient_percent` | numeric 0–1000, default `0` | Коэффициент на работы (проценты) |
| `created_by` / `updated_by` | uuid FK → profiles.id | Аудит |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete |

### 3.2 `project_estimate_sections` — разделы сметы (11 записей)

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор раздела |
| `workspace_owner_id` | uuid FK | Tenant |
| `project_id` | uuid FK → projects.id | Проект |
| `estimate_record_id` | uuid FK → project_estimate_records.id | Родительская смета |
| `title` / `number` | text NOT NULL | Название и номер раздела |
| `sort_order` | int, default `0` | Порядок для drag & drop |
| `works_amount` | numeric, default `0` | Сумма всех работ раздела |
| `materials_amount` | numeric, default `0` | Сумма всех материалов раздела |
| `total_amount` | numeric, default `0` | Полная сумма раздела |
| `created_by` / `updated_by` | uuid FK | Аудит |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete |

### 3.3 `project_estimate_works` — работы в смете (36 записей)

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор работы |
| `workspace_owner_id` / `project_id` / `estimate_record_id` / `section_id` | uuid FK | Иерархическая привязка |
| `directory_work_id` | uuid FK → directory_works.id, nullable | Ссылка на справочник работ |
| `directory_work_version` | int, nullable | Версия из справочника |
| `number` / `code` / `title` | text | Номер, код, название |
| `unit_code` / `unit_label` | text | Единицы измерения |
| `quantity` / `price` / `total_amount` | numeric ≥ 0 | Количество, цена, сумма |
| `base_price` | numeric ≥ 0, default `0` | Базовая цена из справочника |
| `category` / `notes` | text, nullable | Категория и примечания |
| `sort_order` | int, default `0` | Порядок для drag & drop |
| `created_by` / `updated_by` | uuid FK | Аудит |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete |

### 3.4 `project_estimate_materials` — материалы в смете (39 записей)

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор материала |
| `workspace_owner_id` / `project_id` / `estimate_record_id` / `section_id` / `work_id` | uuid FK | Полная иерархическая привязка |
| `directory_material_id` / `directory_material_version` | uuid/int, nullable | Ссылка на справочник |
| `number` / `code` / `title` | text | Номер, код, название |
| `unit_code` / `unit_label` | text | Единицы измерения |
| `quantity` / `price` / `total_amount` | numeric ≥ 0 | Количество, цена, сумма |
| `consumption` | numeric, nullable, > 0 | Коэффициент расхода |
| `supplier_name` / `notes` | text, nullable | Поставщик и примечания |
| `sort_order` | int, default `0` | Порядок для drag & drop |
| `created_by` / `updated_by` | uuid FK | Аудит |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete |

### Общие паттерны таблиц

- **Soft delete**: `archived_at` + `deleted_at` (не физическое удаление)
- **Аудит**: `created_by` / `updated_by` / `created_at` / `updated_at`
- **Иерархия FK**: `workspace_owner_id` → `project_id` → `estimate_record_id` → `section_id` → `work_id`
- **Суммы**: constraint `≥ 0`
- **Все ID**: UUID (генерируются `uuid_generate_v4()`)

---

## 4. API

### 4.1 Route Handlers

На момент 2026-05-22 **выделенных API-роутов для смет (`app/api/projects/[id]/estimate-records/`) не существует**. Весь доступ к данным смет осуществляется через:

- **Supabase RPC-функции** (Postgres-функции с `SECURITY DEFINER`): для мутаций (создание/архивирование/реордеринг)
- **Прямые запросы через Supabase SDK**: для чтения (RLS фильтрует по `workspace_owner_id`)

### 4.2 RPC-функции (из миграций Supabase)

| Функция | Назначение |
|---|---|
| `create_estimate_section` | Создать раздел сметы |
| `add_work_from_directory_to_estimate` | Добавить работу из справочника |
| `add_material_from_directory_to_estimate` | Добавить материал из справочника |
| `archive_estimate_section` | Soft-delete раздела |
| `archive_estimate_work` | Soft-delete работы |
| `archive_estimate_material` | Soft-delete материала |
| `reorder_estimate_sections` | Изменить порядок разделов (drag & drop) |
| `reorder_estimate_works` | Изменить порядок работ |
| `reorder_estimate_materials` | Изменить порядок материалов |
| `recalculate_materials_by_work_quantity` | Пересчёт материалов при изменении кол-ва работы |

Все RPC-функции выполняются с `SECURITY DEFINER` (обход RLS с серверной валидацией прав).

---

## 5. Компоненты

### 5.1 `EstimateSection` — корневой раздел сметы

**Файл:** `features/estimates/estimate-details/components/estimate-section.tsx`

Композиционный компонент, собирающий:
- **Заголовок**: Collapsible-триггер с иконкой Chevron + бейджи этапов
- **Сводные итоги**: `EstimateSummaryValue` (Работы, Материалы)
- **Список работ**: `EstimateRow` × N (каждая работа — collapsible)
- **Футер**: кнопки «Добавить раздел», «Добавить работу», «Удалить раздел»

**Поток данных:**
```
EstimateSection
  └─→ useEstimates()           ← хук (workRows, totals, toggleWork, updateWork, updateMaterial)
        ├─→ workRows.map(work → EstimateRow)
        │     └─→ materials.map(mat → EstimateMaterialCard)
        └─→ totals.workTotal / totals.materialTotal
```

### 5.2 `EstimateRow` — строка работы

**Файл:** `features/estimates/estimate-details/components/estimate-row.tsx`

Собирает:
- **Collapsible-триггер**: `EstimateWorkNumber` (№ + value)
- **Название**: `EstimateName` (Textarea inline-редактирование)
- **Метрики**: `EditableBadge` (Кол-во, Цена), `Badge` (Итого = `getTotal(qty, price)`)
- **Действия**: `EstimateWorkActions` (Pencil, Copy, Gear)
- **Материалы**: `EstimateMaterialCard` × N внутри `CollapsibleContent`

**Пропсы:**
```typescript
{
  isExpanded: boolean         // раскрыта ли работа
  onToggle: () => void        // переключение раскрытия
  onUpdateWork: (id, Partial<Work>) => void    // обновление полей работы
  onUpdateMaterial: (workId, materialId, Partial<Material>) => void
  work: Work                  // объект работы
}
```

### 5.3 `EstimateMaterialCard` — карточка материала

**Файл:** `features/estimates/estimate-details/components/estimate-material-card.tsx`

Карточка материала внутри работы:
- **Заголовок**: `EstimateMaterialName` (Textarea) + `EstimateMaterialActions` (DropdownMenu)
- **Бейджи**: номер (`workNumber.index`), единица измерения
- **Метрики**: 4 `EditableBadge` (Кол-во, Расход, Цена, Итого)
- **Расчёт итого**: `getTotal(material.quantity, material.price)` → `formatMoney()`

### 5.4 `EstimateNavigationTabs` — табы навигации

**Файл:** `features/estimates/components/estimate-navigation-tabs.tsx`

5 вкладок:

| Вкладка | Путь | Страница |
|---|---|---|
| Смета | `/projects/:pid/estimates/:eid` | `page.tsx` |
| Закупки | `.../purchases` | `purchases/page.tsx` |
| Исполнение | `.../execution` | `execution/page.tsx` |
| Финансы | `.../finances` | `finances/page.tsx` |
| Документы | `.../documents` | `documents/page.tsx` |

Адаптивная навигация: на ширине `< @4xl` — `Select` (выпадающий список), на `≥ @4xl` — `Tabs` (горизонтальные табы).

### 5.5 `EstimateTabToolbar` — тулбар вкладки

**Файл:** `features/estimates/estimate-tabs/components/estimate-tab-toolbar.tsx`

Контекстно-зависимый тулбар — состав кнопок зависит от активной вкладки:

| Вкладка | Кнопки |
|---|---|
| Смета | Импорт, Экспорт, Коэффициент |
| Закупки | Импорт, Экспорт |
| Исполнение | Импорт, Экспорт, Доп. работа |
| Финансы | Платёж, Экспорт |
| Документы | Документ, Импорт |

**Функциональность поиска:** синхронизирует `?q=` в URL через `useSearchParams` + `router.replace`.

### 5.6 Вспомогательные компоненты

| Компонент | Назначение |
|---|---|
| `CreateSectionDialog` | Диалог создания раздела (поля: №, Название) |
| `EstimateEmptyState` | Состояние до создания первого раздела (кнопки «Создать раздел», «Импорт») |
| `EstimateMetricGroup` | Группировка метрик с заголовком (рамка + uppercase label) |
| `EstimateValue` | Бейдж «label: value» с опциональным `strong` |
| `EstimateSummaryValue` | Сводный итог (label + форматированная сумма в отдельном блоке) |
| `EstimateTabPlaceholder` | Заглушка для нереализованных вкладок (Финансы, Документы) |

### 5.7 Контекст: хук `useEstimates`

**Файл:** `features/estimates/hooks/use-estimates.ts`

Центральный хук состояния сметы:

```typescript
return {
  workRows,              // Work[] — строки работ (сейчас моки, позже из БД)
  expandedStages,        // boolean — раскрыт ли раздел
  setExpandedStages,     // переключение раздела
  expandedWorks,         // Set<string> — ID раскрытых работ
  totals,                // { materialTotal, workTotal } — useMemo
  toggleWork,            // (id) => void — переключение раскрытия работы
  updateWork,            // (id, Partial<Work>) => void — обновление работы
  updateMaterial,        // (workId, materialId, Partial<Material>) => void
}
```

**Расчёт итогов:**
```typescript
totals.workTotal = workRows.reduce((sum, w) => sum + w.quantity * w.price, 0)
totals.materialTotal = workRows.reduce(
  (sum, w) => sum + w.materials.reduce((ms, m) => ms + m.quantity * m.price, 0), 0
)
```

---

## 6. Optimistic Updates

На момент 2026-05-22 **механизм optimistic updates в кодовой базе не реализован**. Ожидаемое расположение: `features/estimates/estimate-details/lib/optimistic-update.ts`.

### Планируемый механизм

При переходе от моков к реальным данным (Supabase), хук `useEstimates` будет заменён на optimistic-паттерн:

```
1. Пользователь изменяет значение (quantity, price)
2. UI немедленно обновляется (optimistic — без ожидания ответа сервера)
3. Отправляется RPC-запрос к Supabase
4. При успехе — подтверждение, состояние синхронизировано
5. При ошибке — rollback к предыдущему состоянию + toast с ошибкой
```

### Ключевые точки оптимистичных обновлений

| Мутация | RPC-функция | Поля для optimistic |
|---|---|---|
| Изменить кол-во/цену работы | `update_estimate_work` | `quantity`, `price` |
| Изменить кол-во/цену/расход материала | `update_estimate_material` | `quantity`, `price`, `waste` |
| Изменить название работы | `update_estimate_work` | `title` |
| Изменить название материала | `update_estimate_material` | `title` |
| Добавить работу из справочника | `add_work_from_directory_to_estimate` | Весь объект Work |
| Добавить материал из справочника | `add_material_from_directory_to_estimate` | Весь объект Material |
| Удалить работу | `archive_estimate_work` | Удаление из массива |
| Удалить материал | `archive_estimate_material` | Удаление из массива |
| Реордеринг | `reorder_estimate_works` / `reorder_estimate_materials` | `sort_order` |

### Ожидаемая структура optimistic-утилит

```typescript
// features/estimates/estimate-details/lib/optimistic-update.ts (ПЛАН)
export function optimisticUpdateWork(
  workId: string,
  updates: Partial<Work>,
  previousWorks: Work[]
): Work[] { /* немедленное обновление */ }

export function optimisticUpdateMaterial(
  workId: string,
  materialId: string,
  updates: Partial<Material>,
  previousWorks: Work[]
): Work[] { /* немедленное обновление */ }

export function rollbackWork(workId: string, snapshot: Work[]): Work[] { /* откат */ }
```

---

## 7. Tenant boundary (Multi-tenant изоляция)

Все таблицы смет реализуют multi-tenant изоляцию через:

### 7.1 Поле `workspace_owner_id`

Каждая запись содержит `workspace_owner_id` (FK → `profiles.id`). RLS-политики гарантируют, что пользователь видит только записи своего workspace:

```sql
-- Типичная RLS-политика (упрощённо)
CREATE POLICY "workspace isolation" ON project_estimate_sections
  FOR ALL USING (workspace_owner_id = auth.uid());
```

### 7.2 Каскад tenant-поля

`workspace_owner_id` присутствует на всех уровнях иерархии:
- `project_estimate_records.workspace_owner_id`
- `project_estimate_sections.workspace_owner_id`
- `project_estimate_works.workspace_owner_id`
- `project_estimate_materials.workspace_owner_id`

Это гарантирует изоляцию даже при JOIN-запросах без явного tenant-фильтра.

### 7.3 RPC-функции с SECURITY DEFINER

Для обхода RLS при мутациях используются Postgres-функции с `SECURITY DEFINER`, которые:
1. Выполняются с привилегиями создателя (обычно `postgres`)
2. Внутри функции **явно проверяют** `workspace_owner_id = auth.uid()`
3. Возвращают ошибку при попытке доступа к чужим данным

### 7.4 Клиентская изоляция

На фронтенде tenant-изоляция обеспечивается:
- **Supabase Auth JWT** — автоматически включает `auth.uid()` во все запросы
- **RLS на сервере** — фильтрует результаты по `workspace_owner_id`
- **Supabase SDK** — все запросы через `createClient()` (серверный с куками) или `createBrowserClient()` (клиентский)

---

## 8. Связанные модули

| Модуль | Связь |
|---|---|
| `features/projects/` | Смета принадлежит проекту (`project_id`) |
| `features/purchases/` | Вкладка «Закупки» сметы → компонент PurchasesView |
| `features/execution/` | Вкладка «Выполнение» сметы → компонент ExecutionView |
| `features/directory-works/` | Добавление работ из справочника через `directory_work_id` |
| `features/directory-materials/` | Добавление материалов из справочника через `directory_material_id` |
| `lib/formatters.ts` | `formatMoney()` — форматирование сумм |
| `lib/calculations.ts` | `getTotal()` — умножение кол-ва на цену |

---

## 9. Текущее состояние и план развития

| Этап | Статус |
|---|---|
| **БД-схема** | ✅ Готова (таблицы + индексы + RLS + RPC-функции) |
| **Моки (фронтенд)** | ✅ Реализованы (2 работы, 5 материалов, диалог создания раздела) |
| **UI-компоненты** | ✅ Полная декомпозиция (16 компонентов + хук) |
| **Навигация (табы)** | ✅ 5 вкладок, адаптивная (Select / Tabs) |
| **Тулбар** | ✅ Контекстный (разные кнопки для каждой вкладки) |
| **Inline-редактирование** | ✅ EditableBadge и Textarea с локальным состоянием |
| **API Route Handlers** | ❌ Не реализованы (планируются в `app/api/projects/[id]/estimate-records/`) |
| **Optimistic Updates** | ❌ Не реализованы (план: `features/estimates/estimate-details/lib/optimistic-update.ts`) |
| **Подключение к БД** | ❌ Не реализовано (хук использует моки, нужна замена на Supabase SDK/RPC) |
| **Drag & Drop** | ❌ UI не реализован (RPC-функции в БД готовы) |
| **Вкладки Финансы/Документы** | ❌ Заглушки (EstimateTabPlaceholder) |
| **Импорт/Экспорт** | ❌ Кнопки есть, логика отсутствует |
