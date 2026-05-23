# Справочник материалов (directory-materials)

> 2026-05-23 · статус: полностью реализован (production-ready бэкенд и фронтенд с интеграцией гибридного поиска, импорта и экспорта).

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
│   └── directory-materials-query-keys.ts      # Ключи кэша React Query
├── components/
│   ├── directory-materials-view.tsx           # Основное представление справочника материалов
│   └── directory-materials-category-filter.tsx # Фильтр по категориям и подкатегориям
├── directory-materials-details/
│   └── components/
│       ├── directory-materials-section.tsx    # Секция отображения списка материалов
│       ├── directory-materials-row.tsx        # Строка конкретного материала (с поддержкой изображений)
│       ├── directory-material-form-dialog.tsx # Диалог создания и редактирования материала
│       └── directory-material-import-dialog.tsx # Диалог пошагового импорта из CSV
├── hooks/
│   ├── use-directory-material-categories.ts   # Хук получения списка категорий
│   └── use-directory-materials.ts             # Основной хук для списка, мутаций и импорта
├── lib/
│   └── query.ts                               # Вспомогательные функции запросов
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

- **Импорт (CSV):** пошаговый мастер в диалоге `directory-material-import-dialog.tsx` позволяет загружать огромные файлы CSV (до 100 тыс.+ строк) за счет оптимизированного репозитория `directory-materials-large-import.repository.ts`, который разбивает данные на пакеты (batches) и минимизирует транзакционные задержки.
- **Экспорт (Excel):** экспорт каталога материалов в формате XLSX с использованием бэкенд-сервиса экспорта.

---

## Текущее состояние

| Задача | Статус | Комментарий |
|---|---|---|
| **БД-схема и RLS** | ✅ Готова | Настроены все таблицы, связи и политики доступа. |
| **API Route Handlers** | ✅ Готовы | Полноценные Next.js эндпоинты с валидацией Zod. |
| **Клиентский хук** | ✅ Готов | `useDirectoryMaterials` интегрирован с API и React Query. |
| **Изображения материалов**| ✅ Готовы | UI-строка поддерживает рендеринг изображений по URL. |
| **Фильтрация по категориям**| ✅ Готова | Компонент категории корректно фильтрует список. |
| **Создание/Редактирование** | ✅ Готово | Диалог `directory-material-form-dialog.tsx` позволяет редактировать записи. |
| **Импорт (CSV)** | ✅ Готов | Поддержка больших файлов с пакетной вставкой в БД. |
| **Экспорт (XLSX)** | ✅ Готов | Формирование и скачивание XLSX-файлов. |
| **Гибридный поиск** | ✅ Готов | Текстовое + векторное AI-ранжирование. |
