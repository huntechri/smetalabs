# Модуль «Проекты» (Projects)

> 2026-05-22 · статус: вёрстка-заглушка (фронтенд), БД-схема готова, API не реализован

---

## 1. Назначение

Модуль «Проекты» — корневая бизнес-сущность SmetaLab. Проект объединяет сметы, закупки и выполнение в рамках одной стройки/объекта. Каждый проект принадлежит workspace-владельцу (multi-tenant) и может быть связан с контрагентом-заказчиком.

### Ключевые возможности

- Создание и управление проектами
- Привязка к заказчику (справочник контрагентов)
- Отслеживание статуса: `new` → `in_progress` → `completed`
- Бюджетирование (поле `budget_amount`)
- Вложенные сметы (`project_estimate_records`)
- Карточки статистики на дашборде

---

## 2. Структура модуля

```
features/projects/
└── components/
    ├── projects-view.tsx       # Представление списка проектов (обёртка)
    ├── project-card.tsx        # Карточка одного проекта
    └── section-cards.tsx       # Карточки статистики (раздел проектов)
```

### Роутинг (App Router)

```
app/(main)/projects/
├── page.tsx                    # Список проектов (SectionCards + ProjectsView)
└── [projectId]/
    ├── page.tsx                # Детальная страница проекта (возвращает null — заглушка)
    └── estimates/
        └── [estimateId]/       # Сметы проекта (роутинг описан в features/estimates/docs/)
```

---

## 3. Таблица базы данных

### 3.1 `projects` — проекты (3 записи на 2026-05-22)

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор проекта |
| `workspace_owner_id` | uuid FK → profiles.id | Multi-tenant изоляция |
| `title` / `normalized_title` | text NOT NULL | Название (и нормализованное) |
| `customer_name` | text, nullable | Имя заказчика (текстовое поле) |
| `address` | text, nullable | Адрес объекта |
| `budget_amount` | numeric, nullable, ≥ 0 | Бюджет проекта |
| `start_date` / `end_date` | text, nullable | Даты начала/окончания (текст, не дата) |
| `status` | enum: `new`, `in_progress`, `completed` | Статус проекта |
| `progress` | int, 0–100 | Процент выполнения |
| `customer_counterparty_id` | uuid FK → directory_counterparties.id, nullable | Ссылка на контрагента |
| `search_text` | text | Полнотекстовый поиск |
| `created_by` / `updated_by` | uuid FK → profiles.id | Аудит |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete |

### 3.2 Связанные таблицы

| Таблица | Связь |
|---|---|
| `project_estimate_records` | FK `project_id` → projects.id (сметы проекта) |
| `project_estimate_sections` | FK `project_id` → projects.id (разделы смет) |
| `project_estimate_works` | FK `project_id` → projects.id (работы смет) |
| `project_estimate_materials` | FK `project_id` → projects.id (материалы смет) |
| `global_purchases` | FK `project_id` → projects.id, nullable (сводные закупки) |
| `directory_counterparties` | FK `customer_counterparty_id` → directory_counterparties.id |

### 3.3 Общие паттерны

- `workspace_owner_id` на всех таблицах (multi-tenant через RLS)
- Soft delete: `archived_at` + `deleted_at`
- Аудит: `created_by` / `updated_by` / `created_at` / `updated_at`
- Все ID: UUID
- Все суммы: constraint `≥ 0`

---

## 4. API

На момент 2026-05-22 **API-роутов для проектов не существует** (`app/api/projects/` отсутствует). Планируемый эндпоинт:

```
GET    /api/projects              — список проектов (с фильтрацией по workspace_owner_id через RLS)
POST   /api/projects              — создать проект
GET    /api/projects/[id]         — детали проекта
PATCH  /api/projects/[id]         — обновить проект
DELETE /api/projects/[id]         — архивировать проект (soft delete)
```

Для доступа к сметам проекта — отдельный эндпоинт:
```
GET    /api/projects/[id]/estimate-records — список смет проекта
```

Текущий доступ к данным проектов — **только через Supabase SDK** (прямые запросы с RLS-фильтрацией) или **RPC-функции**.

---

## 5. Компоненты

### 5.1 `ProjectsView` — представление списка проектов

**Файл:** `features/projects/components/projects-view.tsx`

**Текущее состояние:** заглушка. Содержит:
- `ButtonGroup` с тремя кнопками-заглушками
- Два вложенных пустых контейнера с dashed-рамками

```tsx
export function ProjectsView() {
  return (
    <div className="h-full min-h-0 px-4 lg:px-6">
      <div className="h-full min-h-0 rounded-lg border border-dashed p-6 flex flex-col gap-4">
        <ButtonGroup className="flex-wrap">
          <Button variant="outline">Button 1</Button>
          <Button variant="outline">Button 2</Button>
          <Button variant="outline">Button 3</Button>
        </ButtonGroup>
        <div className="rounded-lg border border-dashed p-6">
          <div className="rounded-lg border border-dashed p-6" />
        </div>
      </div>
    </div>
  )
}
```

**Планируемое поведение:** список проектов с фильтрацией по статусу, поиском и пагинацией.

### 5.2 `ProjectCard` — карточка проекта

**Файл:** `features/projects/components/project-card.tsx`

Карточка с изображением, названием и кнопкой перехода:

```typescript
interface ProjectCardProps {
  title: string
  description: string
  image: string
  link: string
}
```

**Состав:**
- `CardHeader`: `CardTitle` + `CardDescription`
- `CardContent`: `AspectRatio` (9/16) с `next/image` (заполнение через `object-cover`)
- `CardFooter`: `Button asChild` → ссылка `<a href={link}>`

### 5.3 `SectionCards` — карточки статистики

**Файл:** `features/projects/components/section-cards.tsx`

4 карточки с метриками в сетке (`@xl/main:grid-cols-2 @5xl/main:grid-cols-4`):

| Карточка | Заголовок | Значение | Тренд |
|---|---|---|---|
| Общая выручка | CardDescription | $1,250.00 | +12.5% ↑ |
| Новые клиенты | CardDescription | 1,234 | -20% ↓ |
| Активные аккаунты | CardDescription | 45,678 | +12.5% ↑ |
| Темп роста | CardDescription | 4.5% | +4.5% ↑ |

**Примечание:** карточки используют **хардкоженные данные** (не подключены к БД). Это унаследованный код из shadcn/ui-шаблона, требующий замены на реальные метрики проектов.

**Стилизация:**
- Градиентный фон: `from-primary/5 to-card`
- Тёмная тема: `bg-card`
- Тренды: `TrendUp` / `TrendDown` из Phosphor Icons

### 5.4 Страница списка проектов

**Файл:** `app/(main)/projects/page.tsx`

```tsx
export default function Page() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 min-h-0">
        <div className="scrollbar-subtle flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 min-h-0 overflow-y-auto">
          <SectionCards />
          <div className="flex-1 min-h-0">
            <ProjectsView />
          </div>
        </div>
      </div>
    </div>
  )
}
```

Композиция: `SectionCards` (статистика) + `ProjectsView` (список проектов) внутри скроллируемого контейнера.

### 5.5 Страница деталей проекта

**Файл:** `app/(main)/projects/[projectId]/page.tsx`

```tsx
export default function ProjectDetailsPage({ params }: { params: { projectId: string } }) {
  return null;
}
```

**Текущее состояние:** возвращает `null` — страница-заглушка. Детальный просмотр проекта не реализован.

---

## 6. Tenant boundary (Multi-tenant изоляция)

### 6.1 Поле `workspace_owner_id`

Таблица `projects` содержит `workspace_owner_id` (FK → `profiles.id`). RLS-политики ограничивают доступ:

```sql
-- Упрощённая RLS-политика
CREATE POLICY "workspace isolation" ON projects
  FOR ALL USING (workspace_owner_id = auth.uid());
```

### 6.2 Каскад в связанных таблицах

Все дочерние таблицы также содержат `workspace_owner_id`:
- `project_estimate_records.workspace_owner_id`
- `project_estimate_sections.workspace_owner_id`
- `project_estimate_works.workspace_owner_id`
- `project_estimate_materials.workspace_owner_id`

Это гарантирует, что при любом JOIN-запросе tenant-изоляция сохраняется.

### 6.3 Проверка прав (RBAC)

Права на проекты определены в `types/roles.ts` и проверяются через `lib/auth/permissions.ts`:

| Право | owner | admin | manager | estimator | viewer |
|---|---|---|---|---|---|
| `projects.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `projects.create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `projects.update` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `projects.delete` | ✅ | ✅ | ✅ | ❌ | ❌ |

Хелперы:
```typescript
import { canManageProjects, hasPermission } from "@/lib/auth/permissions"
// canManageProjects() → true если есть любое из projects.{create,update,delete}
// hasPermission('projects.read') → true если есть право чтения
```

---

## 7. Связанные модули

| Модуль | Связь |
|---|---|
| `features/estimates/` | Сметы принадлежат проекту (вложенный роутинг `[projectId]/estimates/[estimateId]`) |
| `features/global-purchases/` | Сводные закупки могут быть привязаны к проекту (`project_id` nullable) |
| `features/directory-counterparties/` | Заказчик проекта из справочника контрагентов (`customer_counterparty_id`) |
| `features/dashboard/` | `SectionCards` используется на странице `/projects` и на дашборде |
| `lib/auth/permissions.ts` | RBAC-проверки прав на проекты |

---

## 8. Текущее состояние и план развития

| Этап | Статус |
|---|---|
| **БД-схема** | ✅ Готова (таблица `projects` + индексы + RLS) |
| **UI ProjectsView** | 🟡 Заглушка (пустые контейнеры + кнопки) |
| **UI ProjectCard** | ✅ Реализован (но не подключён к данным) |
| **UI SectionCards** | 🟡 Хардкоженные данные (требует замены на реальные метрики) |
| **Страница списка проектов** | ✅ Композиция готова (SectionCards + ProjectsView) |
| **Страница деталей проекта** | ❌ Заглушка (возвращает null) |
| **API Route Handlers** | ❌ Не реализованы |
| **Подключение к БД** | ❌ Не реализовано |
| **Фильтрация и поиск** | ❌ Не реализованы |
| **Создание/редактирование проектов** | ❌ Формы не реализованы |
