# Справочник материалов (directory-materials)

> Статус: production | feature layers migrated | 2026-06-01

## Назначение

Центральный каталог строительных материалов и изделий. Хранит эталонные расценки, единицы измерения, категории, информацию о поставщиках, изображения и поисковые индексы. Используется сметным модулем для добавления материалов в сметы.

**Маршрут:** `/directories/materials`  
**Страница:** `app/(main)/directories/materials/page.tsx`  
**Масштаб данных:** 35 226 активных записей, 106 678 строк импорта.

## Структура модуля

```
features/directory-materials/
├── api/
│   ├── directory-materials-client.ts               # HTTP/API adapters: fetch, create, update, archive, import, export
│   ├── directory-materials-query-keys.ts            # Ключи кэширования и теги инвалидации
│   └── directory-materials-errors.ts               # Ошибки API-клиента
├── application/
│   ├── use-directory-materials.ts                  # Use-case orchestration: список, мутации, импорт (TanStack Query)
│   └── use-directory-material-categories.ts        # Use-case: дерево категорий/подкатегорий/поставщиков
├── model/
│   ├── directory-materials-model.ts                # Типы, constants, form mapping, selectors, URL params parsing
│   └── directory-materials-model.test.ts           # Unit-тесты чистой модели
├── ui/
│   ├── directory-materials-view.tsx                # Layout-обёртка со Suspense
│   ├── directory-materials-section.tsx             # Список, пагинация, dialog orchestration
│   ├── directory-materials-row.tsx                 # Строка материала: код, название, ед. изм., цена, категория
│   ├── directory-materials-category-filter.tsx     # Фильтр по категории, подкатегории и поставщику
│   ├── directory-material-form-dialog.tsx          # Диалог создания/редактирования материала
│   └── directory-material-import-dialog.tsx        # Диалог пошагового CSV-импорта с preview
├── server/
│   ├── directory-materials-ai.ts                   # AI-семантический поиск (pgvector + OpenAI)
│   ├── directory-materials-import.repository.ts    # Репозиторий импорта CSV (пакетная вставка)
│   ├── directory-materials-large-import.repository.ts # Оптимизированный репозиторий для больших файлов
│   ├── directory-materials-fast-import.repository.ts  # Быстрый импорт данных
│   ├── directory-materials.export.ts               # Логика экспорта в CSV
│   ├── directory-materials.repository.ts           # Базовые CRUD-операции с БД
│   ├── directory-materials.route-handlers.ts       # Обработчики Next.js Route Handlers
│   ├── directory-materials.schemas.ts              # Zod-схемы валидации
│   └── directory-materials.service.ts             # Сервис бизнес-логики и контроля прав
└── docs/
    └── README.md

app/api/directory-materials/
├── route.ts                                        # GET (список), POST (создание)
├── [id]/route.ts                                   # GET (детали), PATCH (обновление), DELETE (архивирование)
├── categories/route.ts                             # GET (дерево категорий)
├── export/route.ts                                 # GET (экспорт CSV)
├── ai-search/route.ts                              # POST (семантический поиск)
├── embeddings/process/route.ts                     # POST (обновление векторных эмбеддингов)
└── import-jobs/
    ├── route.ts                                    # POST (создать задачу импорта)
    └── [id]/
        ├── route.ts                                # GET (статус задачи)
        ├── batches/route.ts                        # POST (добавить пакет строк)
        └── apply-fast/route.ts                     # POST (применить импорт)
```

## Слои

- `ui` — JSX, layout, формы, модалки, локальный визуальный state и вызов команд.
- `model` — чистые типы, constants, form mapping, selectors, URL params parsing, event dispatchers, import constants.
- `application` — сценарии загрузки/создания/обновления/архивирования/импорта, TanStack Query и invalidation.
- `api` — HTTP-доступ к `/api/directory-materials`, error adapter и backend contracts.
- `server` — серверные route handlers, schemas, service, repositories и AI-поиск.

## Данные

### TypeScript: `DirectoryMaterial`

```typescript
export type DirectoryMaterial = {
  id: string
  name: string
  unit: string
  unitCode: string
  unitLabel: string
  price: number
  priceAmount: number
  currencyCode: string
  category: string
  subcategory: string | null
  code: string | null
  supplierName: string | null
  supplierId: string | null
  imageUrl: string | null
  description: string | null
  aliases: string[]
  keywords: string[]
  status: "active" | "archived"
  version: number
  metadata: {
    sourceName: string | null
    sourceExternalRowKey: string | null
    createdAt: string
    updatedAt: string
    searchRank?: number | null
  }
}
```

### `DirectoryMaterialsListParams`

```typescript
export type DirectoryMaterialsListParams = {
  q?: string
  category?: string
  subcategory?: string
  unit?: string
  status?: "active" | "archived"
  supplier?: string
  limit?: number
  cursor?: number
  sort?: "relevance" | "updated_desc" | "name_asc"
}
```

### `DirectoryMaterialMutationInput`

```typescript
export type DirectoryMaterialMutationInput = {
  name: string
  unit: string
  price: number
  category: string
  subcategory?: string | null
  code?: string | null
  supplierName?: string | null
  imageUrl?: string | null
  description?: string | null
  aliases?: string[]
  keywords?: string[]
  sourceName?: string | null
  sourceExternalRowKey?: string | null
  currencyCode?: string
}
```

## API

Все backend contracts сохранены без изменений.

| Метод | Путь | Назначение |
|-------|------|------------|
| `GET` | `/api/directory-materials` | Список материалов с пагинацией, поиском, сортировкой и фильтрацией |
| `POST` | `/api/directory-materials` | Создание нового материала |
| `PATCH` | `/api/directory-materials/[id]` | Редактирование материала |
| `DELETE` | `/api/directory-materials/[id]` | Soft-delete / архивирование |
| `GET` | `/api/directory-materials/categories` | Дерево категорий, подкатегорий и поставщиков |
| `GET` | `/api/directory-materials/export` | Экспорт каталога в CSV |
| `POST` | `/api/directory-materials/ai-search` | Семантический поиск по векторным эмбеддингам |
| `POST` | `/api/directory-materials/embeddings/process` | Обновление векторных индексов |
| `POST` | `/api/directory-materials/import-jobs` | Создать задачу импорта CSV |
| `GET` | `/api/directory-materials/import-jobs/[id]` | Статус задачи импорта |
| `POST` | `/api/directory-materials/import-jobs/[id]/batches` | Добавить пакет строк в задачу |
| `POST` | `/api/directory-materials/import-jobs/[id]/apply-fast` | Применить импорт |

## Поиск

Реализована гибридная стратегия поиска через RPC-функцию `search_directory_materials_ai`:

1. **Точное совпадение** — по коду или по внешнему ключу.
2. **Префиксное и полнотекстовое** — по нормализованному имени, поставщику, алиасам и ключевым словам.
3. **Семантический поиск** — по векторным эмбеддингам (`pgvector` + OpenAI `text-embedding-3-small`, 1536 измерений).
4. **Гибридный скоринг** — `(semantic_score × 0.68) + (text_score × 0.32)` с детальным `match_reason`.

## Поведение

Behavior changes: none.

Сохранены:

- поля материала, ед. изм., категории и поставщика;
- поиск, фильтрация по категории/подкатегории/поставщику, пагинация;
- создание, редактирование и архивирование;
- пошаговый CSV-импорт с preview (batch-загрузка);
- экспорт в CSV;
- гибридный AI-поиск;
- текущие HTTP/backend contracts.
