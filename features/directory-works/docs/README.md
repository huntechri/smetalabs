# Справочник работ (directory-works)

> **Статус:** production | **Дата:** 2026-05-22
>
> Полная документация модуля справочника работ. Объединяет архитектуру, поисковую систему и оптимизации производительности.

---

## Назначение

Справочник работ — центральный каталог строительных и ремонтных работ. Хранит эталонные расценки, единицы измерения, категории и поисковые индексы. Используется сметным модулем для наполнения смет работами из каталога.

**Масштаб данных:** 723 активные записи, 4 071 синонимов, 6 543 ключевых слов, 724 векторных эмбеддинга.

---

## Структура модуля

```
features/directory-works/
├── components/
│   └── directory-works-view.tsx               # Входная точка модуля (layout + скролл)
├── directory-works-details/
│   └── components/
│       ├── directory-works-section.tsx         # Контейнер списка (хук → map → Row)
│       ├── directory-works-row.tsx             # Одна строка (имя + метрики)
│       ├── directory-works-name.tsx            # Атомарный UI: название работы
│       ├── directory-works-value.tsx           # Атомарный UI: бейдж со значением
│       └── directory-works-metric-group.tsx    # Атомарный UI: группа метрик
├── hooks/
│   └── use-directory-works.ts                 # Хук данных (пока мок, затем Supabase)
└── __mocks__/
    └── directory-works.ts                     # 10 тестовых записей

Связанные файлы за пределами модуля:
├── types/directory-work.ts                    # Тип DirectoryWorkRow
├── features/directories/components/
│   ├── directories-toolbar.tsx                # Общий тулбар с поиском и кнопками действий
│   └── works-toolbar.tsx                      # Конкретный тулбар для работ
└── app/(main)/directories/works/page.tsx      # Страница справочника
```

**Количество файлов в модуле:** 8 (5 компонентов + 1 хук + 1 мок + 1 view)

---

## Данные

### Таблицы базы данных

Все таблицы в схеме `public`, RLS включён, multi-tenant изоляция через `workspace_owner_id`.

#### `directory_works` — основная таблица (723 записи)

| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `workspace_owner_id` | uuid FK → `profiles.id` | Tenant-изоляция |
| `title` | text NOT NULL | Название работы (trimmed) |
| `normalized_title` | text | Нормализованное название для дедупликации |
| `unit_code` | text | Код единицы измерения (напр. `m2`) |
| `unit_label` | text | Человекочитаемая метка («м²», «шт», «точка») |
| `rate_amount` | numeric | Расценка ≥ 0 |
| `currency_code` | varchar(3) | Код валюты, default `'RUB'`, regex `^[A-Z]{3}$` |
| `price_kind` | enum | `base`, `labor`, `turnkey`, `estimate`, `custom` |
| `category` | text NOT NULL | Категория |
| `subcategory` | text nullable | Подкатегория |
| `code` | text nullable | Код по классификатору (уникален в workspace) |
| `description` | text nullable | Описание работы |
| `included_operations` | text nullable | Включённые операции |
| `excluded_operations` | text nullable | Исключённые операции |
| `source_name` | text nullable | Источник данных |
| `source_external_row_key` | text nullable | Внешний ключ источника |
| `dedupe_fingerprint` | text | Хеш для дедупликации |
| `search_text` | text | Предвычисленный поисковый текст |
| `search_fts` | tsvector | Полнотекстовый индекс (GIN) |
| `status` | enum | `active`, `archived` |
| `version` | int | ≥ 1, default `1` |
| `sort_order` | numeric | Порядок сортировки, default `0` |
| `created_by` / `updated_by` | uuid FK → `profiles.id` | Аудит |
| `created_at` / `updated_at` | timestamptz | Временные метки |
| `archived_at` / `deleted_at` | timestamptz nullable | Soft delete |

#### `work_aliases` — синонимы названий (4 071 запись)

| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid PK | |
| `workspace_owner_id` | uuid FK | Tenant-изоляция |
| `work_id` | uuid FK → `directory_works.id` | Ссылка на работу |
| `alias` | text | Текст синонима |
| `weight` | numeric | Вес (для ранжирования) |
| `deleted_at` | timestamptz nullable | Soft delete |

#### `work_keywords` — ключевые слова (6 543 записи)

| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid PK | |
| `workspace_owner_id` | uuid FK | Tenant-изоляция |
| `work_id` | uuid FK → `directory_works.id` | Ссылка на работу |
| `keyword` | text | Ключевое слово |
| `weight` | numeric | Вес (для ранжирования) |
| `deleted_at` | timestamptz nullable | Soft delete |

#### `directory_work_embeddings` — векторные эмбеддинги (724 записи)

| Колонка | Тип | Описание |
|---|---|---|
| `workspace_owner_id` | uuid FK | Tenant-изоляция |
| `work_id` | uuid FK → `directory_works.id` | Ссылка на работу |
| `model_name` | text | Модель эмбеддингов: `text-embedding-3-small` |
| `dimensions` | int | Размерность вектора: `1536` |
| `embedding` | vector(1536) | Векторное представление |
| `content_hash` | text | SHA-256 хеш текста (инвалидация) |
| `embedding_input_text` | text | Исходный текст для генерации эмбеддинга |
| `status` | enum | `pending`, `ready`, `stale`, `failed` |
| `last_error` | text nullable | Текст последней ошибки |
| `created_at` / `updated_at` | timestamptz | |

#### `directory_work_import_jobs` — задачи импорта (1 запись)

Статусы: `draft`, `uploaded`, `parsing`, `parsed`, `validating`, `validated`, `ready_for_review`, `applying`, `applied`, `failed`.

#### `directory_work_import_rows` — строки импорта (722 записи)

Статусы: `pending`, `valid`, `warning`, `error`, `duplicate`, `conflict`.

### Тип данных (TypeScript)

**Файл:** `types/directory-work.ts`

```typescript
export type DirectoryWorkRow = {
  id: string
  title: string        // название работы
  unit: string         // ед. изм (м², шт, точка...)
  rate: number         // расценка (цена за единицу)
  category: string     // категория работ
}
```

**Текущее состояние:** тип покрывает только UI-слой (5 полей). Полная структура таблицы БД (27 колонок) в UI-типе не отражена — фронтенд пока работает с мок-данными.

---

## API

### RPC-функции (PostgreSQL)

Все функции находятся в схеме `public`, используют `SECURITY DEFINER` для контролируемого обхода RLS.

#### `search_directory_works` — полнотекстовый поиск

```
search_directory_works(
  p_workspace_owner_id uuid,
  p_q text,                -- поисковый запрос
  p_category text,         -- фильтр по категории
  p_subcategory text,      -- фильтр по подкатегории
  p_unit text,             -- фильтр по единице измерения
  p_status directory_work_status,  -- active / archived
  p_limit integer,         -- лимит (1–100)
  p_cursor integer,        -- офсет
  p_sort text              -- 'relevance', 'updated_desc', 'title_asc'
)
```

**Алгоритм (трёхпроходная стратегия):**

1. **Без запроса (`p_q IS NULL`):** возвращает все записи с фильтрами, сортировка по `sort_order` или `title_asc`/`updated_desc`
2. **Точное совпадение:** поиск по `code` или `source_external_row_key` — возврат с `search_rank = 1000`, без дальнейшего ранжирования
3. **Быстрый поиск:** `normalized_title = query`, `LIKE 'query%'`, `code LIKE`, `FTS @@`
4. **Нечёткий fallback:** если быстрый поиск не дал результатов — `pg_trgm.similarity()` с порогами 0.18 (title) и 0.12 (search_text)

**Ранжирование (candidate_rank):**
- Совпадение `normalized_title = query` → +800
- `normalized_title LIKE 'query%'` → +600
- `code LIKE 'query%'` → +550
- `source_external_row_key LIKE 'query%'` → +500
- `ts_rank_cd(search_fts, tsquery)` → ×120
- `similarity()` для нечёткого поиска → ×90

**Возвращает:** полные строки `directory_works` + `aliases` (text[]) + `keywords` (text[]) + `search_rank` (double) + `total_count` (bigint).

#### `hybrid_search_directory_works` — гибридный поиск (FTS + pgvector)

```
hybrid_search_directory_works(
  p_workspace_owner_id uuid,
  p_q text,
  p_category text,
  p_subcategory text,
  p_unit text,
  p_query_embedding vector(1536),  -- вектор запроса
  p_limit integer,                  -- 1–50
  p_threshold double precision,     -- порог 0–1, default 0.72
  p_model_name text,                -- default 'text-embedding-3-small'
  p_dimensions integer              -- default 1536
)
```

**Алгоритм:**
1. **Текстовый поиск** через `search_directory_works` (первые 50 результатов)
2. **Семантический поиск** через `directory_work_embeddings` + `<=>` (cosine distance)
3. **Fusion:** комбинированный `hybrid_score`:
   - Текст ≥ 800 → `exact_text` (вес 1.0)
   - Иначе: `(text_score / 1000 × 0.7) + (semantic_score × 0.3) + hybrid_bonus`
4. **match_reason:** `exact_text`, `hybrid_match`, `text_match`, `semantic_match`

#### `get_directory_work_detail` — детальная информация о работе

```
get_directory_work_detail(
  p_workspace_owner_id uuid,
  p_id uuid
)
```

Возвращает одну запись `directory_works` с агрегированными `aliases` и `keywords` (через LATERAL JOIN).

#### `get_directory_work_categories` — агрегация категорий

```
get_directory_work_categories(
  p_workspace_owner_id uuid,
  p_status directory_work_status
)
```

Возвращает: `category`, `subcategory`, `unit_code`, `unit_label`, `total_count` (сгруппировано).

#### `get_directory_works_performance_snapshot` — метрики состояния

```
get_directory_works_performance_snapshot(p_workspace_owner_id uuid)
```

Возвращает агрегированные счётчики:
- `works.active`, `works.archived`, `works.deleted`
- `import_jobs.open`, `import_rows.unresolved`
- `embeddings.ready`, `embeddings.pending_or_stale_or_failed`
- `works.active_without_ready_embedding`

#### `update_directory_work_with_embedding` — обновление работы

```
update_directory_work_with_embedding(
  p_workspace_owner_id uuid,
  p_id uuid,
  p_title text,
  p_rate numeric,
  p_unit text,
  p_category text,
  p_subcategory text,
  p_code text,
  p_description text,
  p_included_operations text,
  p_excluded_operations text,
  p_source_name text,
  p_source_external_row_key text,
  p_currency_code varchar,
  p_price_kind directory_work_price_kind,
  p_user_id uuid,
  p_enqueue_embedding boolean
)
```

**Логика:**
- Валидация: title/unit/category обязательны, rate ≥ 0
- Проверка дубликатов: `code` и `source_name + source_external_row_key` — уникальны в workspace
- Инкремент `version`
- При `p_enqueue_embedding = true`: формирует `embedding_input_text` из title + category + subcategory + unit + price_kind + description + included/excluded operations + aliases + keywords
- Сравнивает `content_hash` (SHA-256), помечает старые эмбеддинги `stale`, создаёт новый в статусе `pending`

#### `explain_directory_works_search_plan` — EXPLAIN поиска

```
explain_directory_works_search_plan(
  p_workspace_owner_id uuid, p_q text, p_category text,
  p_subcategory text, p_unit text, p_status directory_work_status,
  p_limit integer, p_cursor integer, p_sort text
)
```

Возвращает `EXPLAIN (FORMAT JSON)` для отладки query-плана.

### Клиентский API (React-хук)

**Файл:** `features/directory-works/hooks/use-directory-works.ts`

```typescript
export function useDirectoryWorks() {
  return { works: directoryWorkRows }
}
```

**Текущее состояние:** хук возвращает статические мок-данные (10 записей) из `__mocks__/directory-works.ts`. Вызовов Supabase/SDK/RPC в клиентском коде нет. Планируется замена на `supabase.rpc('search_directory_works', ...)`.

### API Routes (Next.js)

Отсутствуют. Взаимодействие с БД планируется через прямые вызовы Supabase SDK (клиент) или RPC (серверные экшены). На 2026-05-22 API-роутов для `directory-works` нет.

---

## Поиск

### Технологический стек

| Технология | Назначение | Статус |
|---|---|---|
| **pg_trgm** | Триграммный поиск, `similarity()`, GIN-индекс на `normalized_title` | ✅ Реализован в RPC |
| **FTS (tsvector)** | Полнотекстовый поиск через `websearch_to_tsquery('simple', ...)` на колонке `search_fts` | ✅ Реализован в RPC |
| **pgvector** | Векторное хранилище для семантического поиска (эмбеддинги OpenAI `text-embedding-3-small`, 1536 измерений) | ✅ Реализован |
| **Гибридный поиск** | Комбинация FTS + pgvector через `hybrid_search_directory_works` | ✅ Реализован |
| **Клиентский поиск** | URL-параметр `?q=` через `DirectoriesToolbar` (только UI, фильтрация не выполняется) | ⚠️ Только UI |

### Индексы

- **GIN на `search_fts`:** `gin(to_tsvector('simple', coalesce(search_text, '')))` — для `@@ tsquery`
- **GIN trgm на `normalized_title`:** `gin(normalized_title gin_trgm_ops)` — для `similarity()` и `ILIKE`
- **IVFFlat на `embedding`:** `ivfflat(embedding vector_cosine_ops) WITH (lists = 100)` — для `<=>` cosine distance

### Стратегия маршрутизации запросов (в `search_directory_works`)

```
query IS NULL         → полный список (фильтры, пагинация)
exact code match      → точное совпадение (rank = 1000)
fast prefix/ILIKE     → быстрый текстовый поиск
no fast results       → нечёткий fallback (pg_trgm.similarity)
```

### Генерация эмбеддингов

Эмбеддинги генерируются асинхронно через внешний воркер (Edge Function или фоновая задача). RPC-функция `update_directory_work_with_embedding` при `p_enqueue_embedding = true`:
1. Собирает структурированный текст из всех полей работы + алиасов + ключевых слов
2. Вычисляет SHA-256 `content_hash`
3. Помечает старые эмбеддинги как `stale`
4. Вставляет новую запись в `directory_work_embeddings` со статусом `pending`
5. Внешний воркер забирает `pending`-записи, вызывает OpenAI API, сохраняет вектор

---

## Импорт/экспорт

### Импорт (Staged CSV)

**Таблицы:** `directory_work_import_jobs` + `directory_work_import_rows`

Процесс многоэтапный:
1. **Загрузка:** CSV-файл → строки в `directory_work_import_rows` (статус `pending`)
2. **Валидация:** проверка обязательных полей, форматов, дубликатов
3. **Review:** пользователь подтверждает/отклоняет строки
4. **Применение:** валидные строки → вставка/обновление в `directory_works`

Статусы import_jobs: `draft` → `uploaded` → `parsing` → `parsed` → `validating` → `validated` → `ready_for_review` → `applying` → `applied` (или `failed`).

Статусы import_rows: `pending` → `valid` / `warning` / `error` / `duplicate` / `conflict`.

### Экспорт (XLSX)

Кнопка «Экспорт» в тулбаре (`WorksToolbar`) — UI-заглушка. Серверная реализация экспорта в XLSX отсутствует (на 2026-05-22).

---

## Производительность

### Индексы

| Индекс | Тип | Назначение |
|---|---|---|
| `search_fts` | GIN (tsvector) | Полнотекстовый поиск `@@` |
| `normalized_title` | GIN (trgm) | Нечёткий поиск `similarity()`, `ILIKE` |
| `embedding` | IVFFlat (vector) | Косинусное расстояние `<=>` |
| `workspace_owner_id` + `status` | B-tree (составной) | Tenant-фильтрация + статус |
| `code` | B-tree UNIQUE | Точный поиск по коду |
| `source_name` + `source_external_row_key` | B-tree UNIQUE | Дедупликация импорта |

### RPC-оптимизации

- **Трёхпроходная стратегия** в `search_directory_works`: точное совпадение → быстрый → нечёткий. Минимизирует вызовы `similarity()` (дорогой оператор).
- **LATERAL JOIN** для алиасов/ключевых слов — агрегация подзапросами, не блокирует основной запрос.
- **Лимит 1–100** строк (контроль размера ответа).
- **Курсорная пагинация** (`p_cursor`/`p_limit`) — стабильная при изменении данных.

### Мониторинг

`get_directory_works_performance_snapshot` — единый вызов для мониторинга:
- Количество активных/архивированных/удалённых работ
- Открытых задач импорта и неразрешённых строк
- Готовых и проблемных эмбеддингов
- Работ без готового эмбеддинга

### Кэширование

На 2026-05-22 слой кэширования (React Query, SWR, серверный кэш) не реализован. Хук `useDirectoryWorks()` возвращает статические мок-данные.

---

## Tenant boundary

Изоляция между workspace реализована на уровне БД:

- **`workspace_owner_id`** — обязательное поле на всех таблицах модуля (FK → `profiles.id`)
- **RLS** включён на всех таблицах (`directory_works`, `work_aliases`, `work_keywords`, `directory_work_embeddings`, `directory_work_import_jobs`, `directory_work_import_rows`)
- **RPC-функции** принимают `p_workspace_owner_id` первым параметром — серверная валидация принадлежности
- **SECURITY DEFINER** — функции выполняются с правами создателя, обходят RLS, но проверяют tenant вручную

---

## Текущие ограничения

1. **UI работает на мок-данных.** Хук `useDirectoryWorks()` возвращает хардкоженные 10 записей из `__mocks__/`. Состояния loading/empty/error не реализованы.
2. **Поиск в UI не выполняет фильтрацию.** `DirectoriesToolbar` устанавливает URL-параметр `?q=`, но хук его не читает и не передаёт в RPC.
3. **Нет API-роутов.** Клиентский код не вызывает Supabase SDK. Взаимодействие с БД — только через SQL-миграции на уровне БД.
4. **UI-тип неполный.** `DirectoryWorkRow` содержит 5 полей, в БД 27 колонок + алиасы + ключевые слова + эмбеддинги.
5. **Экспорт в XLSX** — только кнопка в тулбаре, реализация отсутствует.
6. **Кэширование отсутствует.** Нет слоя React Query, SWR или серверного кэширования результатов поиска.
7. **Нет диалога создания.** В отличие от `directory-suppliers` (есть `CreateDialog`) и `directory-counterparties`, модуль работ не имеет UI для добавления новых записей.
8. **Эмбеддинги требуют внешнего воркера.** RPC только создаёт `pending`-записи. Генерация векторов через OpenAI API должна выполняться отдельным процессом (Edge Function или cron-задача).

---

## Связанные документы

- [Стандарт построения Directory-модулей](../../../docs/directory-module-standard.md)
- [Система поиска SmetaLabs](../../../docs/search-system.md)
- [Архитектура бэкенда](../../../docs/backend-architecture.md) — раздел 1.2 «Справочники», раздел 3.2 «База данных как API»
- [Общая архитектура](../../../docs/architecture.md) — раздел «Структура feature-модуля»
