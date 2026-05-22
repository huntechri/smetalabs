# Справочник материалов (directory-materials)

> **Статус:** production | **Дата:** 2026-05-22
>
> Полная документация модуля справочника материалов. Объединяет архитектуру, UI, AI-поиск и интеграцию с Supabase.

---

## Назначение

Справочник материалов — центральный каталог строительных материалов и изделий. Хранит эталонные цены, единицы измерения, категории, поставщиков, изображения и поисковые индексы. Используется сметным модулем для наполнения смет материалами.

**Масштаб данных:** 35 226 активных записей, 106 678 строк импорта, 4 задачи импорта.

---

## Структура модуля

```
features/directory-materials/
├── components/
│   └── directory-materials-view.tsx               # Входная точка модуля (layout + скролл)
├── directory-materials-details/
│   └── components/
│       ├── directory-materials-section.tsx         # Контейнер списка (хук → map → Row)
│       ├── directory-materials-row.tsx             # Одна строка (имя + метрики + изображение)
│       ├── directory-materials-name.tsx            # Атомарный UI: название материала
│       ├── directory-materials-value.tsx           # Атомарный UI: бейдж со значением
│       └── directory-materials-metric-group.tsx    # Атомарный UI: группа метрик
├── hooks/
│   └── use-directory-materials.ts                 # Хук данных (пока мок, затем Supabase)
└── __mocks__/
    └── directory-materials.ts                     # 10 тестовых записей

Связанные файлы за пределами модуля:
├── types/directory-material.ts                    # Тип DirectoryMaterialRow
├── features/directories/components/
│   ├── directories-toolbar.tsx                    # Общий тулбар с поиском и кнопками действий
│   └── materials-toolbar.tsx                      # Конкретный тулбар для материалов
└── app/(main)/directories/materials/page.tsx      # Страница справочника
```

**Количество файлов в модуле:** 8 (5 компонентов + 1 хук + 1 мок + 1 view)

---

## Данные

### Таблицы базы данных

Все таблицы в схеме `public`, RLS включён, multi-tenant изоляция через `workspace_owner_id`.

#### `directory_materials` — основная таблица (35 226 записей)

| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `workspace_owner_id` | uuid FK → `profiles.id` | Tenant-изоляция |
| `name` | text NOT NULL | Название материала |
| `normalized_name` | text | Нормализованное название для дедупликации |
| `unit_code` | text | Код единицы измерения |
| `unit_label` | text | Человекочитаемая метка («шт», «кг», «лист») |
| `price_amount` | numeric | Цена за единицу ≥ 0 |
| `currency_code` | varchar(3) | Код валюты, default `'RUB'` |
| `category` | text | Категория |
| `subcategory` | text nullable | Подкатегория |
| `code` | text nullable | Код по классификатору |
| `description` | text nullable | Описание |
| `supplier_name` | text nullable | Название поставщика |
| `supplier_id` | uuid FK nullable | Ссылка на `directory_suppliers.id` |
| `image_url` | text nullable | URL изображения |
| `aliases` | text[] | Синонимы названия, default `'{}'` |
| `keywords` | text[] | Ключевые слова, default `'{}'` |
| `source_name` | text nullable | Источник данных |
| `source_external_row_key` | text nullable | Внешний ключ источника |
| `search_text` | text | Предвычисленный поисковый текст |
| `search_fts` | tsvector | Полнотекстовый индекс |
| `dedupe_fingerprint` | text | Хеш для дедупликации |
| `status` | enum | `active`, `archived` |
| `version` | int | ≥ 1, default `1` |
| `sort_order` | numeric | Порядок сортировки, default `0` |
| `created_by` / `updated_by` | uuid FK → `profiles.id` | Аудит |
| `created_at` / `updated_at` | timestamptz | Временные метки |
| `archived_at` / `deleted_at` | timestamptz nullable | Soft delete |

**Отличия от `directory_works`:**
- Поле названия: `name` / `normalized_name` (вместо `title` / `normalized_title`)
- Есть `supplier_name`, `supplier_id` (nullable)
- Есть `image_url` (nullable)
- `aliases` и `keywords` встроены в таблицу как массивы `text[]` (в работах — отдельные таблицы)
- Нет `price_kind`, `included_operations`, `excluded_operations`

#### `directory_material_embeddings` — векторные эмбеддинги (0 записей)

| Колонка | Тип | Описание |
|---|---|---|
| `workspace_owner_id` | uuid FK | Tenant-изоляция |
| `material_id` | uuid FK → `directory_materials.id` | Ссылка на материал |
| `model_name` | text | Модель: `text-embedding-3-small` |
| `dimensions` | int | Размерность: `1536` |
| `embedding` | vector(1536) | Векторное представление |
| `content_hash` | text | SHA-256 хеш |
| `embedding_input_text` | text | Исходный текст |
| `status` | enum | `pending`, `ready`, `stale`, `failed` |
| `last_error` | text nullable | |
| `created_at` / `updated_at` | timestamptz | |

**Важно:** на 2026-05-22 таблица пуста (0 записей). Эмбеддинги материалов не сгенерированы (в отличие от работ, где 724 записи).

#### `directory_material_import_jobs` — задачи импорта (4 записи)

Статусы: `draft`, `uploaded`, `parsing`, `parsed`, `validating`, `validated`, `ready_for_review`, `applying`, `applied`, `failed`.

#### `directory_material_import_rows` — строки импорта (106 678 записей)

Статусы: `pending`, `valid`, `warning`, `error`, `duplicate`, `conflict`.

### Тип данных (TypeScript)

**Файл:** `types/directory-material.ts`

```typescript
export type DirectoryMaterialRow = {
  id: string
  title: string         // название материала
  unit: string          // ед. изм (шт, м, кг, лист, упак, м²...)
  price: number         // цена за единицу
  imageUrl?: string     // URL изображения товара (опционально)
  category: string      // категория
}
```

**Текущее состояние:** тип покрывает только UI-слой (5 полей). Полная структура таблицы БД (25+ колонок) в UI-типе не отражена. В UI-типе поле названия — `title`, в БД — `name`.

---

## API

### RPC-функции (PostgreSQL)

#### `search_directory_materials_ai` — гибридный AI-поиск

```
search_directory_materials_ai(
  p_workspace_owner_id uuid,
  p_query text,
  p_query_embedding vector(1536),  -- вектор запроса
  p_limit integer,                  -- 1–50, default 20
  p_threshold double precision,     -- порог 0–1, default 0.72
  p_category text,                  -- опциональный фильтр
  p_subcategory text,               -- опциональный фильтр
  p_unit text                       -- опциональный фильтр
)
```

**Алгоритм:**

1. **Семантический поиск:** `1 - (embedding <=> p_query_embedding)` (cosine similarity) через `directory_material_embeddings` с фильтром `model_name = 'text-embedding-3-small'` и `status = 'ready'`
2. **Текстовый поиск** (комбинированное ранжирование):
   - `code` точное совпадение (lower) → score 1.00
   - `source_external_row_key` точное совпадение → 0.98
   - `normalized_name = query` → 0.95
   - `normalized_name LIKE 'query%'` → 0.82
   - `supplier_name LIKE '%query%'` → 0.58
   - Совпадение в `aliases[]` → 0.76
   - Совпадение в `keywords[]` → 0.70
   - `category LIKE '%query%'` → 0.50
   - `subcategory LIKE '%query%'` → 0.48
   - `search_text ILIKE '%query%'` → 0.45
3. **Гибридный скор:** `(semantic_score × 0.68) + (text_score × 0.32)`
4. **match_reason** (человекочитаемый):
   - `≥ 0.95` → «Точное совпадение»
   - `≥ 0.80` → «Совпадение по названию»
   - `≥ 0.70` → «Совпадение по синонимам или ключевым словам»
   - semantic `≥ 0.86` → «Близкий по смыслу материал»
   - text `> 0` → «Текстовое совпадение»
   - Иначе → «Семантическое совпадение»

**Фильтрация:** точное совпадение `category = p_category`, `subcategory = p_subcategory`, `unit_code = p_unit OR unit_label = p_unit`.

**Сортировка:** точные совпадения (text_score ≥ 0.95) первыми, затем по `hybrid_score DESC`, `text_score DESC`, `updated_at DESC`, `id ASC`.

### Клиентский API (React-хук)

**Файл:** `features/directory-materials/hooks/use-directory-materials.ts`

```typescript
export function useDirectoryMaterials() {
  return { materials: directoryMaterialRows }
}
```

**Текущее состояние:** хук возвращает статические мок-данные (10 записей) из `__mocks__/directory-materials.ts`. Вызовов Supabase/SDK/RPC в клиентском коде нет.

### API Routes (Next.js)

Отсутствуют. На 2026-05-22 API-роутов для `directory-materials` нет.

---

## Поиск

### Технологический стек

| Технология | Назначение | Статус |
|---|---|---|
| **pgvector** | Векторное хранилище (OpenAI `text-embedding-3-small`, 1536d) | ✅ Реализован в RPC |
| **Текстовый поиск** | `ILIKE`, префиксный поиск по `normalized_name`, `code`, `supplier_name`, массивам `aliases[]`/`keywords[]` | ✅ Реализован в RPC |
| **Гибридный поиск** | Комбинация pgvector + текстового поиска в `search_directory_materials_ai` | ✅ Реализован |
| **FTS (tsvector)** | Колонка `search_fts` присутствует в таблице | ⚠️ Не используется в RPC |
| **pg_trgm** | Триграммные индексы | ❌ Статус неизвестен |
| **Клиентский поиск** | URL-параметр `?q=` через `DirectoriesToolbar` (только UI) | ⚠️ Только UI |

**Отличие от работ:** поиск материалов использует встроенные массивы `aliases[]` и `keywords[]` (а не отдельные таблицы, как в `work_aliases`/`work_keywords`). Скоринг текстового поиска более детальный (10 уровней против 6 в работах).

### Индексы

- **IVFFlat на `embedding`** (в `directory_material_embeddings`): `ivfflat(embedding vector_cosine_ops)`
- **B-tree на `normalized_name`**: префиксный поиск
- **GIN на `search_fts`** (если используется FTS)
- **Составной B-tree:** `workspace_owner_id` + `status` + `deleted_at`

### Эмбеддинги материалов (Edge Function / Worker)

На 2026-05-22 таблица `directory_material_embeddings` **пуста** (0 записей). Эмбеддинги материалов не сгенерированы.

**Планируемая архитектура генерации:**
1. Внешний воркер (Edge Function или cron-задача) опрашивает `directory_materials` без готового эмбеддинга
2. Формирует текст для эмбеддинга: `name` + `category` + `subcategory` + `description` + `aliases` + `keywords`
3. Вызывает OpenAI API (`text-embedding-3-small`)
4. Сохраняет вектор в `directory_material_embeddings` со статусом `ready`
5. При изменении материала — инвалидация через `content_hash`

---

## Импорт/экспорт

### Импорт (Staged CSV)

**Таблицы:** `directory_material_import_jobs` (4 задачи) + `directory_material_import_rows` (106 678 строк).

Процесс идентичен справочнику работ:
1. CSV-файл → строки в `directory_material_import_rows`
2. Валидация: обязательные поля, форматы, дубликаты
3. Review пользователем
4. Применение → `directory_materials`

**Масштаб:** 106 678 строк импорта — крупнейшая таблица импорта в проекте (против 722 строк импорта работ).

### Экспорт (XLSX)

Кнопка «Экспорт» в тулбаре (`MaterialsToolbar`) — UI-заглушка. Серверная реализация отсутствует.

---

## UI

### Компоненты

#### `DirectoryMaterialsView`
Входная точка. Layout: `flex h-full min-h-0 flex-1 flex-col` + `scrollbar-subtle overflow-y-auto`. Делегирует в `DirectoryMaterialsSection`.

#### `DirectoryMaterialsSection`
Контейнер списка. `"use client"`. Вызывает `useDirectoryMaterials()`, маппит на `DirectoryMaterialsRow`. Состояния loading/empty/error не реализованы.

#### `DirectoryMaterialsRow`
Одна строка данных. Двухколоночный адаптивный layout:
- **Левая колонка** (`minmax(320px,1fr)`): `DirectoryMaterialsName` — название материала
- **Правая колонка** (`minmax(560px,0.9fr)`, 4 подколонки):
  - Ед. изм: `DirectoryMaterialsValue` с unit
  - Цена: `DirectoryMaterialsValue` (strong) с `price.toLocaleString("ru-RU") ₽`
  - Изображение: превью `img` 56×56px или `ImageIcon`-placeholder
  - Категория: `DirectoryMaterialsValue` с category

**Особенность:** в отличие от работ, строка материала показывает **изображение** (из `imageUrl`). Если `imageUrl` отсутствует — серый placeholder с иконкой `ImageIcon` (lucide-react).

#### `DirectoryMaterialsName`
Отображает название материала с лейблом «Название». Использует `break-words text-sm font-medium leading-snug`.

#### `DirectoryMaterialsValue`
Бейдж (`Badge variant="outline"`) с лейблом и значением. Поддерживает `strong` (жирный шрифт для цены). Использует `tabular-nums` для выравнивания чисел.

#### `DirectoryMaterialsMetricGroup`
Группа метрик с заголовком (uppercase, `text-xs font-semibold text-muted-foreground`). Дети — один или несколько `DirectoryMaterialsValue`.

### Тулбар

**Файл:** `features/directories/components/materials-toolbar.tsx`

```typescript
const materialsActions = [
  { label: "Добавить", icon: <PlusIcon /> },
  { label: "Импорт", icon: <FileArrowDownIcon /> },
  { label: "Экспорт", icon: <ExportIcon /> },
]
```

Оборачивает `DirectoriesToolbar` с `searchPlaceholder="Поиск материалов"`. Все три кнопки действий — UI-заглушки (onClick не передан).

### Страница

**Файл:** `app/(main)/directories/materials/page.tsx`

```tsx
export default function MaterialsDirectoryPage() {
  return (
    <div className="@container/main flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-6 lg:px-6">
      <MaterialsToolbar />
      <DirectoryMaterialsView />
    </div>
  )
}
```

### Мок-данные (10 записей)

Тестовые данные покрывают категории: «Стеновые материалы» (гипсокартон, профиль, кирпич), «Крепёж», «Отделочные» (шпаклёвка, грунтовка, краска), «Электрика» (кабель, гофра), «Изоляция». Цены: от 38 ₽ (гофра) до 15 000 ₽ (кирпич). Все `imageUrl` — пустые строки.

---

## Tenant boundary

Изоляция идентична модулю работ:
- **`workspace_owner_id`** на всех таблицах
- **RLS** включён на `directory_materials`, `directory_material_embeddings`, `directory_material_import_jobs`, `directory_material_import_rows`
- **RPC `search_directory_materials_ai`** принимает `p_workspace_owner_id` первым параметром
- **SECURITY DEFINER** — обход RLS с серверной валидацией tenant

---

## Текущие ограничения

1. **UI работает на мок-данных.** Хук `useDirectoryMaterials()` возвращает 10 хардкоженных записей. Состояния loading/empty/error не реализованы.
2. **Поиск в UI не выполняет фильтрацию.** URL-параметр `?q=` устанавливается, но не передаётся в хук или RPC.
3. **Нет API-роутов.** Клиентский код не интегрирован с Supabase.
4. **UI-тип неполный и расходится с БД.** Тип `DirectoryMaterialRow` использует `title` (в БД `name`), содержит 5 полей против 25+ колонок в таблице.
5. **Эмбеддинги не сгенерированы.** Таблица `directory_material_embeddings` пуста (0 записей). Семантический поиск через `search_directory_materials_ai` не даст результатов.
6. **Поиск `search_directory_materials_ai` требует `p_query_embedding`.** Клиент должен сначала получить вектор запроса через OpenAI API или Edge Function. В UI этот поток не реализован.
7. **Экспорт в XLSX** — только кнопка, без реализации.
8. **Нет диалога создания.** Модуль не имеет UI для добавления новых материалов.
9. **Кэширование отсутствует.** Нет слоя React Query или серверного кэша.
10. **Импорт: 106 678 строк.** Крупнейший объём данных среди всех справочников. Требуется оптимизация batch-обработки.

---

## Связанные документы

- [Справочник работ](../directory-works/docs/README.md) — эталонный модуль (поиск, эмбеддинги, импорт реализованы полнее)
- [Стандарт построения Directory-модулей](../../../docs/directory-module-standard.md)
- [Система поиска SmetaLabs](../../../docs/search-system.md) — раздел 2.4 «pgvector — семантический поиск»
- [Архитектура бэкенда](../../../docs/backend-architecture.md) — раздел 1.2 «Справочники», раздел 1.4 «Вспомогательные таблицы»
- [Общая архитектура](../../../docs/architecture.md) — раздел «Структура feature-модуля»
