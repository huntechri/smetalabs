# Модуль «Глобальные закупки» (Global Purchases)

> 2026-05-23 · статус: полностью реализован (бэкенд API и интерактивный фронтенд с интеграцией БД, фильтрацией, пагинацией, импортом и экспортом).

---

## 1. Назначение

Модуль «Глобальные закупки» — сводная ведомость закупок материалов по всем проектам. В отличие от закупок внутри конкретной сметы (вкладка «Закупки» в `features/purchases/`), глобальные закупки агрегируют потребности на уровне workspace и позволяют:

- Планировать закупки материалов (сравнение плана с фактом).
- Сравнивать плановые и фактические показатели (количество, цена, сумма).
- Назначать поставщиков и даты закупки.
- Привязывать позиции к конкретным проектам и объектам.
- Фильтровать по проектам, статусу и диапазону дат.
- Выгружать и загружать данные через XLSX/CSV.

---

## 2. Структура модуля

```
features/global-purchases/
├── api/
│   ├── global-purchases-client.ts             # Клиентские HTTP-запросы к API
│   └── global-purchases-query-keys.ts         # Ключи кэширования для React Query
├── hooks/
│   └── use-global-purchases.ts                # Хук управления состоянием (React Query + URL query params)
├── lib/
│   └── query.ts                               # Вспомогательные утилиты для запросов
├── server/
│   ├── global-purchases-material-options.repository.ts # Подсказки по материалам
│   ├── global-purchases.export.ts             # Бэкенд-экспорт в XLSX-формат
│   ├── global-purchases.repository.ts         # Доступ к БД через Drizzle ORM
│   ├── global-purchases.route-handlers.ts     # Обработчики API-роутов
│   ├── global-purchases.schemas.ts            # Zod-схемы валидации запросов
│   └── global-purchases.service.ts            # Бизнес-логика и контроль прав
└── global-purchases-details/
    └── components/
        ├── global-purchases-view.tsx          # Контейнер отображения экрана глобальных закупок
        ├── global-purchases-screen.tsx        # Главный экран
        ├── global-purchases-toolbar.tsx       # Панель инструментов (поиск, фильтры по датам и объектам, импорт/экспорт)
        ├── global-purchases-section.tsx       # Секция со списком строк
        ├── global-purchases-list.tsx          # Сетка списка закупок
        ├── global-purchases-row.tsx           # Строка закупки (поля ввода, календари, выбор поставщиков)
        ├── global-purchase-material-dialog.tsx # Диалог добавления/редактирования материала закупки
        ├── global-purchase-archive-dialog.tsx  # Диалог подтверждения архивации
        ├── global-purchases-import-dialog.tsx # Диалог импорта файлов
        ├── global-purchases-pagination.tsx    # Пагинация
        ├── global-purchases-name.tsx          # Рендеринг названия и единиц измерения
        ├── global-purchases-value.tsx         # Отображение параметров (Badge)
        └── global-purchases-metric-group.tsx  # Контейнер для бейджей параметров
```

### Роутинг (App Router)

```
app/(main)/procurements/page.tsx   # Страница «Закупки» (рендерит GlobalPurchasesScreen)
```

---

## 3. Таблица базы данных

### 3.1 `global_purchases` — сводные закупки

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | Идентификатор позиции |
| `workspace_owner_id` | uuid FK → profiles.id | Multi-tenant изоляция |
| `title` / `normalized_title` | text NOT NULL | Название материала |
| `unit` | text NOT NULL | Единица измерения |
| `plan_quantity` | numeric ≥ 0 | Плановое количество |
| `plan_price` | numeric ≥ 0 | Плановая цена |
| `fact_quantity` | numeric, nullable | Фактическое количество |
| `fact_price` | numeric, nullable | Фактическая цена |
| `supplier_id` / `supplier_name` | uuid/text, nullable | Ссылка на поставщика и его имя |
| `project_id` / `project_title` | uuid/text, nullable | Ссылка на проект и его название |
| `purchase_date` | text, nullable | Дата закупки |
| `status` | enum: `planned`, `ordered`, `partially_received`, `received`, `cancelled` | Статус закупки |
| `notes` | text | Заметки |
| `created_by` / `updated_by` | uuid FK | Аудит авторов |
| `created_at` / `updated_at` / `archived_at` / `deleted_at` | timestamptz | Soft delete и аудит времени |

---

## 4. API (Next.js Route Handlers)

Все запросы обрабатываются через обработчики HTTP-запросов и проверяют multi-tenant принадлежность:

- `GET /api/global-purchases` — Список закупок с фильтрацией (по строке `q`, `projectId`, `status`, датам `dateFrom`/`dateTo`) и курсорной пагинацией.
- `POST /api/global-purchases` — Создать новую позицию закупки.
- `PATCH /api/global-purchases/[id]` — Обновить существующую позицию.
- `DELETE /api/global-purchases/[id]` — Архивировать позицию (soft delete).
- `GET /api/global-purchases/material-options` — Получение списка материалов для автозаполнения.
- `GET /api/global-purchases/export` — Экспорт данных закупок в XLSX.

---

## 5. Основные компоненты

### 5.1 `GlobalPurchasesToolbar` (Панель инструментов)
Предоставляет расширенную фильтрацию: поиск по подстроке, выбор дат закупки (с помощью `Popover` и `Calendar`), выбор проекта, к которому относится закупка, а также кнопки добавления новой позиции, импорта и экспорта.

### 5.2 `GlobalPurchasesRow` (Строка закупки)
Рендерит детальную информацию по одной закупке. Позволяет прямо в строке изменять фактическую цену и количество, выбирать поставщика и дату закупки, а также переходить в режим детального редактирования или архивации.

### 5.3 `GlobalPurchaseMaterialDialog` (Диалог редактирования)
Модальная форма для детального заполнения позиции: название, единица измерения, плановые и фактические показатели, проект, поставщик, статус, плановая дата и примечания.

### 5.4 `GlobalPurchasesImportDialog` (Импорт)
Позволяет пользователю импортировать данные закупок из загруженного CSV/XLSX-файла.

---

## 6. Текущее состояние

| Задача | Статус | Комментарий |
|---|---|---|
| **БД-схема и RLS** | ✅ Готова | Таблицы, индексы, связи и ограничения. |
| **API Route Handlers** | ✅ Готовы | Полноценные роуты Next.js с Zod-валидацией. |
| **Клиентский хук** | ✅ Готов | `useGlobalPurchases` интегрирован с API и React Query. |
| **Инлайн-редактирование** | ✅ Готово | Изменение факта (количество, цена) прямо в строке. |
| **Фильтры по проектам и датам** | ✅ Готовы | Синхронизация фильтров через URL и React Query. |
| **Выбор поставщика/проекта** | ✅ Готов | Интерактивный выбор с динамической загрузкой данных. |
| **Создание/Редактирование** | ✅ Готово | Диалог `GlobalPurchaseMaterialDialog` полностью интегрирован. |
| **Импорт (CSV/XLSX)** | ✅ Готов | Полнофункциональный диалог импорта с пакетной обработкой. |
| **Экспорт (XLSX)** | ✅ Готов | Выгрузка отфильтрованных закупок в файл Excel. |
