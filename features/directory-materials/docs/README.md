# Справочник материалов (directory-materials)

> 2026-05-31 · статус: полностью реализован (production-ready бэкенд и фронтенд с интеграцией гибридного поиска, импорта и экспорта). Клиентский feature-слой разделён на `model` / `application` / `api` / UI.

---

## Назначение

Справочник материалов — центральный каталог строительных материалов и изделий. Хранит эталонные расценки, единицы измерения, категории, информацию о поставщиках, изображения и поисковые индексы. Используется сметным модулем для добавления материалов в сметы.

**Масштаб данных:** 35 226 активных записей, 106 678 строк импорта.

---

## Структура модуля

```
features/directory-materials/
├── api/
│   ├── directory-materials-client.ts          # API-клиент для работы со справочником
│   ├── directory-materials-errors.ts          # Нормализация ошибок API
│   └── directory-materials-query-keys.ts      # Ключи кэша React Query
├── application/
│   ├── directory-materials-import-workflow.ts # Сценарии preview/apply импорта CSV
│   └── use-directory-materials.ts             # React Query orchestration, загрузка и мутации
├── components/
│   ├── directory-materials-view.tsx           # Основное представление справочника материалов
│   └── directory-materials-category-filter.tsx # Фильтр по категориям и подкатегориям
├── directory-materials-details/
│   └── components/
│       ├── directory-materials-section.tsx    # Секция отображения списка материалов
│       ├── directory-materials-row.tsx        # Строка конкретного материала (с поддержкой изображений)
│       ├── directory-material-form-dialog.tsx # Диалог создания и редактирования материала
│       └── directory-material-import-dialog.tsx # UI-диалог импорта CSV
├── hooks/
│   ├── use-directory-material-categories.ts   # Хук получения списка категорий
│   └── use-directory-materials.ts             # Compatibility re-export из application
├── lib/
│   └── query.ts                               # Вспомогательные функции запросов
├── model/
│   ├── directory-materials-import-model.ts    # Pure import constants, labels and formatters
│   └── directory-materials-model.ts           # Pure params/form/pagination/mapping helpers
└── server/
    ├── directory-materials-ai.ts              # Логика AI семантического поиска
    ├── directory-materials-import.repository.ts # Репозиторий импорта CSV
    ├── directory-materials-large-import.repository.ts # Оптимизированный репозиторий большого импорта
    ├── directory-materials-fast-import.repository.ts # Быстрый импорт данных
    ├── directory-materials.export.ts          # Логика экспорта в Excel (XLSX)
    ├── directory-materials.repository.ts      # Базовые CRUD-операции справочника с БД
    ├── directory-materials.route-handlers.ts  # Обработчики Next.js Route Handlers
    ├── directory-materials.schemas.ts         # Zod-схемы валидации
    └── directory-materials.service.ts         # Сервис бизнес-логики и контроля прав
```

---

## Клиентские слои

- `model` содержит только чистые типы, constants, selectors, mappers, validators, formatters и status helpers. В нём нет React, React Query, router, fetch или DOM side effects.
- `application` содержит клиентские сценарии и orchestration: React Query hook `useDirectoryMaterials`, invalidation policy, mutations, import preview workflow и apply workflow.
- `api` содержит HTTP adapters, query keys и API error normalization.
- UI components отвечают за render, локальное визуальное состояние, формы, таблицы, диалоги и вызов application-команд.

---

## Данные

### Таблицы базы данных

Все таблицы в схеме `public`, RLS включён, multi-tenant изоляция через `workspace_owner_id`.

#### `directory_materials` — основная таблица
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid PK | Уникальный идентификатор материала |
| `workspace_owner_id` | uuid FK → `profiles.id` | Tenant-изоляция |
| `name` / `normalized_name` | text | Название материала |
| `unit_code` / `unit_label` | text | Единицы измерения |
| `price_amount` | numeric | Цена за единицу ≥ 0 |
| `currency_code` | varchar(3) | Код валюты, default `'RUB'` |
| `category` / `subcategory` | text | Категория и подкатегория |
| `code` | text | Код по классификатору |
| `description` | text | Описание |
| `supplier_name` / `supplier_id` | text/uuid | Имя и ID поставщика |
| `image_url` | text | URL изображения |
| `aliases` / `keywords` | text[] | Синонимы и ключевые слова (массивы) |
| `status` | enum | `active`, `archived` |

---

## API (Next.js API Routes)

Клиентское приложение взаимодействует со справочником через Next.js Route Handlers по пути `/api/directory-materials`:

- `GET /api/directory-materials` — Получить список материалов с фильтрацией, пагинацией и сортировкой.
- `POST /api/directory-materials` — Создать новый материал.
- `PATCH /api/directory-materials/[id]` — Редактировать материал.
- `DELETE /api/directory-materials/[id]` — Архивировать материал.
- `GET /api/directory-materials/categories` — Получение дерева категорий и подкатегорий.
- `GET /api/directory-materials/export` — Экспорт справочника материалов в XLSX-формат.
- `POST /api/directory-materials/import-jobs` — Создать задачу импорта CSV.

---

## Поиск (Текстовый + Семантический Гибридный)

Реализована развитая гибридная стратегия поиска с помощью RPC-функции `search_directory_materials_ai`:
1. **Точное совпадение:** по коду или по внешнему ключу.
2. **Префиксное и полнотекстовое совпадение:** по нормализованному имени, поставщику, алиасам и ключевым словам.
3. **Семантический поиск:** по векторным эмбеддингам (`pgvector` + OpenAI `text-embedding-3-small` 1536 измерений).
4. **Гибридный скоринг:** `(semantic_score × 0.68) + (text_score × 0.32)` с детальным обоснованием совпадения (`match_reason`).

---

## Импорт и Экспорт

- **Импорт (CSV):** пошаговый мастер в диалоге `directory-material-import-dialog.tsx` отображает выбор файла, preview, progress и ошибки. Сам workflow preview/apply вынесен в `application/directory-materials-import-workflow.ts`. Большие файлы отправляются пакетами через существующие import job endpoints.
- **Экспорт (Excel):** экспорт каталога материалов в формате XLSX с использованием бэкенд-сервиса экспорта.

---

## Текущее состояние

| Задача | Статус | Комментарий |
|---|---|---|
| **БД-схема и RLS** | ✅ Готова | Настроены все таблицы, связи и политики доступа. |
| **API Route Handlers** | ✅ Готовы | Полноценные Next.js эндпоинты с валидацией Zod. |
| **Клиентский application layer** | ✅ Готов | `useDirectoryMaterials` и import workflow вынесены в `application`. |
| **Клиентский model layer** | ✅ Готов | Form mapping, params, pagination, import constants/labels/formatters вынесены в `model`. |
| **Изображения материалов**| ✅ Готовы | UI-строка поддерживает рендеринг изображений по URL. |
| **Фильтрация по категориям**| ✅ Готова | Компонент категории корректно фильтрует список. |
| **Создание/Редактирование** | ✅ Готово | Диалог `directory-material-form-dialog.tsx` позволяет редактировать записи. |
| **Импорт (CSV)** | ✅ Готов | Поддержка больших файлов с пакетной отправкой через import workflow. |
| **Экспорт (XLSX)** | ✅ Готов | Формирование и скачивание XLSX-файлов. |
| **Гибридный поиск** | ✅ Готов | Текстовое + векторное AI-ранжирование. |
