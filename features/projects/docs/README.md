# Модуль «Проекты» (Projects)

> 2026-05-23 · статус: полностью реализован (как Backend API, так и Frontend с интеграцией БД и RLS).

---

## 1. Назначение

Модуль «Проекты» — корневая бизнес-сущность SmetaLab. Проект объединяет сметы, закупки и выполнение в рамках одной стройки/объекта. Каждый проект принадлежит workspace-владельцу (multi-tenant) и может быть связан с контрагентом-заказчиком.

### Ключевые возможности

- Создание, редактирование, архивация и просмотр проектов.
- Привязка к заказчику из справочника контрагентов.
- Отслеживание статуса: `new` (Новый) → `in_progress` (В работе) → `completed` (Завершен).
- Бюджетирование (отображение бюджета в карточке).
- Курсорная пагинация, фильтрация по статусу и полнотекстовый поиск.
- Просмотр смет проекта на детальной странице.

---

## 2. Структура модуля

```
features/projects/
├── api/
│   ├── projects-client.ts        # Клиентские запросы к API с обработкой ошибок
│   ├── projects-errors.ts        # Обработка ошибок API
│   └── projects-query-keys.ts    # Константы ключей кэша React Query
├── components/
│   ├── projects-view.tsx         # Представление списка проектов (пагинация, статус, поиск)
│   ├── projects-toolbar.tsx      # Панель инструментов (поиск, фильтрация, кнопка добавления)
│   ├── project-card.tsx          # Карточка проекта (информация, статус, ProgressBar, действия)
│   └── create-project-dialog.tsx # Диалог создания/редактирования проекта с выбором контрагента
├── hooks/
│   ├── use-projects.ts           # Хук управления состоянием (React Query + URL query params)
│   └── use-project-estimate-records.ts # Хук управления сметами проекта
├── project-overview/             # Детальный просмотр и дашборд проекта
│   ├── components/
│   │   ├── section-cards.tsx     # Карточки метрик проекта
│   │   ├── chart-area-interactive.tsx # Интерактивный график
│   │   ├── estimates-table.tsx   # Таблица смет проекта
│   │   ├── estimate-name-dialog.tsx   # Создание/редактирование сметы
│   │   └── estimate-delete-dialog.tsx # Подтверждение удаления сметы
│   ├── types.ts                  # Типы детального представления
│   └── lib/
│       └── estimate-table-data.ts # Хелперы форматирования данных для таблицы
└── server/
    ├── projects.repository.ts    # Запросы к БД (Supabase, поиск, валидация уникальности)
    ├── projects.service.ts       # Бизнес-логика, проверка RBAC, нестабильный кэш
    ├── projects.schemas.ts       # Zod-схемы валидации API-запросов
    └── projects.route-handlers.ts # Обработчики HTTP-запросов (Next.js Route Handlers)
```

### Роутинг (App Router)

```
app/(main)/projects/
├── page.tsx                      # Список проектов (рендерит ProjectsView)
└── [projectId]/
    ├── page.tsx                  # Страница проекта (рендерит SectionCards, ChartAreaInteractive и EstimatesTable)
    └── estimates/
        └── [estimateId]/         # Сметы проекта (роутинг описан в features/estimates/docs/)
```

---

## 3. Таблица базы данных

### 3.1 `projects` — проекты

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор проекта |
| `workspace_owner_id` | uuid FK → profiles.id | Multi-tenant изоляция |
| `title` / `normalized_title` | text NOT NULL | Название (и нормализованное) |
| `customer_name` | text, nullable | Имя заказчика (текстовое поле) |
| `address` | text, nullable | Адрес объекта |
| `budget_amount` | numeric, nullable, ≥ 0 | Бюджет проекта |
| `start_date` / `end_date` | text, nullable | Даты начала/окончания |
| `status` | enum: `new`, `in_progress`, `completed` | Статус проекта |
| `progress` | int, 0–100 | Процент выполнения |
| `customer_counterparty_id` | uuid FK → directory_counterparties.id, nullable | Ссылка на контрагента-заказчика |
| `search_text` | text | Полнотекстовый поиск |
| `created_by` / `updated_by` | uuid FK → profiles.id | Аудит |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete и аудит времени |

### 3.2 Связанные таблицы

| Таблица | Связь |
|---|---|
| `project_estimate_records` | FK `project_id` → projects.id (сметы проекта) |
| `project_estimate_sections` | FK `project_id` → projects.id (разделы смет) |
| `project_estimate_works` | FK `project_id` → projects.id (работы смет) |
| `project_estimate_materials` | FK `project_id` → projects.id (материалы смет) |
| `global_purchases` | FK `project_id` → projects.id, nullable (сводные закупки) |
| `directory_counterparties` | FK `customer_counterparty_id` → directory_counterparties.id (справочник контрагентов) |

### 3.3 Общие паттерны

- Multi-tenancy через RLS и проверку `workspace_owner_id`.
- Soft delete (`archived_at` / `deleted_at`).
- Проверка уникальности названия проекта в рамках одного workspace.

---

## 4. API (Next.js Route Handlers)

Все запросы проходят через Next.js Route Handlers в `app/api/projects/` и делегируются в `projects.service.ts`:

```
GET    /api/projects              — список проектов (с поддержкой поиска, фильтрации и пагинации)
POST   /api/projects              — создать новый проект
GET    /api/projects/[id]         — детали проекта
PATCH  /api/projects/[id]         — обновить проект
DELETE /api/projects/[id]         — архивировать проект (soft delete)
```

Для доступа к сметам проекта:
```
GET    /api/projects/[id]/estimate-records — список смет проекта
```

---

## 5. Основные компоненты

### 5.1 `ProjectsView` (Представление списка проектов)

**Файл:** `features/projects/components/projects-view.tsx`

Компонент отвечает за рендеринг списка проектов. Он получает данные с помощью хука `useProjects`, отображает панель инструментов (`ProjectsToolbar`), сетку карточек проектов (`ProjectCard`) с анимацией пульсации при загрузке, выводит ошибки мутаций/загрузки и управляет пагинацией («Назад», «Далее»). Также рендерит модальное окно добавления/редактирования проекта.

### 5.2 `ProjectCard` (Карточка проекта)

**Файл:** `features/projects/components/project-card.tsx`

Представляет визуальную информацию по одному проекту: статус (Новый, В работе, Завершен) со стилизованным индикатором цвета, название проекта, имя заказчика, адрес, форматированный бюджет и сроки. Включает ProgressBar прогресса проекта и кнопки управления (Переход на детальную страницу, Редактировать, Архивировать).

### 5.3 `CreateProjectDialog` (Диалог создания и редактирования)

**Файл:** `features/projects/components/create-project-dialog.tsx`

Форма для ввода названия, статуса, адреса, сроков и заказчика. Интегрирована со справочником контрагентов — подтягивает только активных контрагентов типа `customer` (заказчик) и предоставляет удобный выпадающий список для привязки. Ввод дат начала и окончания переведён на интерактивный выбор даты (`Popover` + `Calendar` из shadcn/ui с русской локалью).

---

## 5.3.1 Оптимизация кэширования и инвалидация бюджета

При обновлении данных сметы (разделов, работ или материалов) на сервере и клиенте происходит автоматическая инвалидация кэша:
- **Серверный кэш**: Вызовы `revalidateTag(projectsCacheTags.list(workspaceOwnerId))` гарантируют, что сервер отдаст обновлённый список проектов с актуальными бюджетами.
- **Клиентский кэш**: Вызовы `queryClient.invalidateQueries({ queryKey: projectsQueryKeys.lists() })` мгновенно заставляют интерфейс обновить карточки проектов на экране без задержек.

### 5.4 `SectionCards` (Карточки статистики)

**Файл:** `features/projects/project-overview/components/section-cards.tsx`

Набор из 4 карточек метрик (Общая выручка, Новые клиенты, Активные аккаунты, Темп роста), отображающийся на детальной странице проекта. На данный момент использует заглушечные статические метрики.

### 5.5 `EstimatesTable` (Таблица смет проекта)

**Файл:** `features/projects/project-overview/components/estimates-table.tsx`

Отображает список смет, привязанных к данному проекту, с указанием их названия, типа, статуса (с CheckCircle или лоадером), суммы и даты создания. Предоставляет возможность создания новой сметы, редактирования ее названия и удаления через выпадающее меню действий.

---

## 6. Tenant boundary (Multi-tenant изоляция)

Доступ к проектам строго разграничен на уровне бизнес-логики (`projects.service.ts`) и RLS-политик Supabase:
- Чтение разрешено любому участнику текущего workspace.
- Модификация (создание, редактирование, архивация) доступна только ролям `owner`, `admin` и `manager`.

---

## 7. Текущее состояние

| Задача | Статус | Комментарий |
|---|---|---|
| **БД-схема** | ✅ Готова | Таблицы, индексы, связи и RLS-политики. |
| **API Route Handlers** | ✅ Готовы | Полноценные Next.js эндпоинты с Zod-валидацией. |
| **Поиск и фильтрация** | ✅ Готовы | Полнотекстовый поиск по токенам + фильтрация по статусу. |
| **Связь с заказчиками** | ✅ Готова | Интеграция со справочником контрагентов. |
| **Пагинация списка** | ✅ Готова | Курсорная пагинация на сервере и клиенте. |
| **Создание/редактирование** | ✅ Готово | Удобные формы в модальных диалогах. |
| **Детальная страница** | ✅ Готова | Отображает статистику, графики и таблицу смет проекта. |
| **Сметы проекта** | ✅ Готовы | Полный CRUD для смет внутри проекта. |
| **Статистические карточки** | 🟡 Заглушка | Используются хардкоженные метрики. |
