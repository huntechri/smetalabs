# Модуль «Сметы» (Estimates)

> 2026-05-23 · статус: полностью реализован (с интеграцией БД, API, оптимистичными обновлениями и RLS).

---

## 1. Назначение

Модуль «Сметы» отвечает за создание, редактирование и просмотр смет в рамках проекта. Смета — иерархическая структура: **запись сметы** → **разделы** → **работы** → **материалы**. Каждая смета привязана к проекту и workspace-владельцу (multi-tenant).

### Ключевые возможности

- Создание разделов сметы (диалог `CreateSectionDialog`).
- Добавление работ и материалов из справочников с помощью диалоговых окон выбора (`EstimateWorkPickerDialog`, `EstimateMaterialPickerDialog`).
- Редактирование количества, цены, названий на месте (inline-редактирование полей).
- Расчёт итоговых сумм (работа = кол-во × цена, итого по разделу = Σ работ + Σ материалов, итого по смете).
- Collapsible-дерево: разделы → работы → материалы.
- Drag & drop реордеринг разделов и работ с оптимистичным обновлением UI и вызовами RPC-функций в БД.
- Коэффициенты на работы (поле `works_coefficient_percent`).
- Вкладки: Смета, Закупки, Выполнение, Финансы, Документы.
- Оптимистичные обновления (Optimistic Updates) для мгновенного отклика интерфейса на операции сохранения, изменения данных и удаления.

---

## 2. Структура модуля

```
features/estimates/
├── api/
│   └── project-estimate-content-client.ts # API-клиент для смет
├── application/
│   ├── estimate-excel-exporter.ts      # Генерация и экспорт смет в Excel
│   ├── use-estimate-editor-scenarios.ts # Сценарии использования редактора (добавление, reorder, удаление)
│   └── use-project-estimate-content.ts # React Query хук получения и мутаций сметного контента
├── model/
│   ├── calculations.ts                 # Чистые расчетные функции (суммы, коэффициенты, округления)
│   ├── calculations.test.ts            # Юнит-тесты расчетов
│   ├── optimistic-update.ts            # Логика оптимистичных обновлений контента
│   ├── optimistic-update.test.ts       # Юнит-тесты оптимистичных обновлений
│   └── estimate-editor-form.ts         # Хелперы парсинга и валидации форм
└── ui/
    ├── types.ts                        # UI типы (состояния диалогов, пэйлоады изменений)
    ├── estimate-editor-view.tsx        # Основной редактор сметного контента
    ├── estimate-editor-context.tsx     # React-контекст для координации событий в UI
    ├── estimate-section-card.tsx       # Карточка раздела сметы
    ├── estimate-work-card.tsx          # Карточка работы
    ├── estimate-material-card.tsx      # Карточка материала
    ├── estimate-work-picker-dialog.tsx # Диалог добавления работ из справочника
    ├── estimate-material-picker-dialog.tsx # Диалог добавления материалов из справочника
    ├── create-section-dialog.tsx       # Диалог создания раздела
    ├── estimate-empty-state.tsx        # Пустое состояние сметы
    ├── estimate-name.tsx               # Инлайн-редактирование имени работы
    ├── estimate-material-name.tsx      # Инлайн-редактирование имени материала
    ├── estimate-work-number.tsx        # UI-отображение номера работы
    ├── estimate-material-actions.tsx   # Dropdown-действия для материала
    ├── estimate-navigation-tabs.tsx    # Вкладки навигации по разделам сметы
    ├── estimate-import-dialog.tsx      # Диалог импорта смет
    └── estimate-tabs/
        ├── estimate-tab-toolbar.tsx    # Тулбар сметного редактора (поиск, экспорт, коэффициент)
        └── estimate-tab-placeholder.tsx # Заглушки для смежных вкладок (Финансы, Документы и др.)
```

### Роутинг (App Router)

```
app/(main)/projects/[projectId]/estimates/[estimateId]/
├── layout.tsx                           # Layout сметы: EstimateNavigationTabs + EstimateTabToolbar
├── page.tsx                             # Вкладка «Состав» (EstimateEditorView / EstimateEmptyState)
├── documents/page.tsx                   # Вкладка «Документы» (EstimateTabPlaceholder)
├── execution/page.tsx                   # Вкладка «Выполнение» (ExecutionView)
├── finances/page.tsx                    # Вкладка «Финансы» (EstimateTabPlaceholder)
└── purchases/page.tsx                   # Вкладка «Закупки» (PurchasesView)
```

---

## 3. Таблицы базы данных

Три основные таблицы в схеме `public`, все с включённым RLS.

### 3.1 `project_estimate_records` — записи смет

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор сметы |
| `workspace_owner_id` | uuid FK → profiles.id | Multi-tenant изоляция |
| `project_id` | uuid FK → projects.id | Привязка к проекту |
| `name` / `normalized_name` | text NOT NULL | Название |
| `type` | text | Тип сметы |
| `status` | enum: `new`, `in_progress`, `completed` | Статус |
| `amount` | numeric | Итоговая сумма сметы |
| `works_coefficient_percent` | numeric | Коэффициент на работы |
| `created_by` / `updated_by` | uuid FK → profiles.id | Аудит |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete и аудит времени |

### 3.2 `project_estimate_sections` — разделы сметы

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор раздела |
| `workspace_owner_id` | uuid FK | Tenant |
| `project_id` | uuid FK | Проект |
| `estimate_record_id` | uuid FK | Родительская смета |
| `title` / `number` | text NOT NULL | Название и номер раздела |
| `sort_order` | int | Порядок для drag & drop |
| `works_amount` | numeric | Сумма всех работ раздела |
| `materials_amount` | numeric | Сумма всех материалов раздела |
| `total_amount` | numeric | Полная сумма раздела |

### 3.3 `project_estimate_works` — работы в смете

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор работы |
| `workspace_owner_id` / `project_id` / `estimate_record_id` / `section_id` | uuid FK | Иерархическая привязка |
| `directory_work_id` | uuid FK, nullable | Ссылка на справочник работ |
| `number` / `code` / `title` | text | Номер, код, название |
| `unit_code` / `unit_label` | text | Единицы измерения |
| `quantity` / `price` / `total_amount` | numeric | Количество, цена, сумма |
| `sort_order` | int | Порядок для drag & drop |

### 3.4 `project_estimate_materials` — материалы в смете

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор материала |
| `workspace_owner_id` / `project_id` / `estimate_record_id` / `section_id` / `work_id` | uuid FK | Иерархическая привязка |
| `directory_material_id` | uuid FK, nullable | Ссылка на справочник материалов |
| `number` / `code` / `title` | text | Номер, код, название |
| `unit_code` / `unit_label` | text | Единицы измерения |
| `quantity` / `price` / `total_amount` | numeric | Количество, цена, сумма |
| `consumption` | numeric, nullable | Коэффициент расхода |

---

## 4. API

Работа со сметным контентом осуществляется через выделенные роуты Next.js API (Route Handlers), вызывающие сервис с проверкой ролей и кэшированием:

```
GET    /api/projects/[id]/estimate-records         — список смет проекта
POST   /api/projects/[id]/estimate-records         — создать новую смету
PATCH  /api/projects/[id]/estimate-records/[recId] — обновить свойства сметы
DELETE /api/projects/[id]/estimate-records/[recId] — архивировать смету
```

А также через RPC-функции базы данных для сложных транзакционных операций:
- `create_estimate_section` — создать раздел сметы
- `archive_estimate_section` — архивация раздела
- `reorder_estimate_sections` / `reorder_estimate_works` — изменение порядка drag & drop
- `recalculate_materials_by_work_quantity` — пересчет материалов при изменении количества работы

---

## 5. Optimistic Updates

В хуке `useProjectEstimateContent` реализована поддержка оптимистичных обновлений (`features/estimates/model/optimistic-update.ts`):
1. UI немедленно реагирует на действия пользователя (изменение количеств, цен, переименования, удаление элементов, DND реордеринг).
2. Запрос посылается на сервер.
3. При ошибке автоматически происходит откат (rollback) к предыдущему сохраненному состоянию кэша.

---

## 6. Текущее состояние и план развития

| Задача | Статус | Комментарий |
|---|---|---|
| **БД-схема** | ✅ Готова | Таблицы, индексы, связи, RLS и RPC. |
| **API Route Handlers** | ✅ Готовы | Обработчики Next.js Route Handlers. |
| **Интеграция с БД** | ✅ Готова | Получение и мутации сметного контента из базы данных. |
| **Инлайн-редактирование** | ✅ Готово | Название, количества и цены редактируются inline. |
| **Drag & Drop** | ✅ Готово | DND-сортировка разделов и работ с помощью `@dnd-kit`. |
| **Optimistic Updates** | ✅ Готовы | Покрыты юнит-тестами и внедрены во все основные мутации. |
| **Подбор из справочников** | ✅ Готов | Диалоги добавления работ и материалов с поиском. |
| **Импорт/Экспорт сметы** | ✅ Готов | Импорт CSV/XLSX, двухстраничный экспорт Excel (для заказчика с превью картинок + технический лист для импорта). |

---

## 7. Импорт и Экспорт (Excel/CSV)

В модуле реализована полноценная поддержка импорта и экспорта смет:
- **Двухстраничный экспорт в Excel**:
  1. Лист **«Смета»**: Презентационный лист для заказчика с оформлением в стиле Slate/Navy, группировкой разделов, формулами Excel (умножение количества на цену и суммирование `SUM` по разделам и по всей смете), а также со встроенными картинками-превью материалов размером `32x32px` (загружаются асинхронно в процессе генерации файла).
  2. Лист **«Для импорта»**: Технический лист, содержащий плоскую таблицу (Раздел, Тип, Код, Наименование, Ед. изм., Кол-во, Цена, Расход, Примечание, Ссылка на изображение), которую можно отредактировать и загрузить обратно.
- **Диалог импорта**: Поддерживает Drag & Drop загрузку `.xlsx` и `.csv` файлов, парсинг Excel-файлов с автоматическим переключением на технический лист `«Для импорта»` при его наличии, проверку на ошибки и вывод интерактивного предпросмотра строк перед применением.
- **Интеграция со справочниками (БД)**: В процессе импорта система сопоставляет коды импортируемых материалов со справочником `directory_materials`:
  * Если материал найден в справочнике, но у него нет изображения в БД — обновляет запись справочника, прописывая переданную в файле ссылку `imageUrl`.
  * Если материал с таким кодом отсутствует в справочнике, но для него передана ссылка на картинку — автоматически создается новый активный материал в справочнике, который затем связывается с импортируемой позицией сметы.
