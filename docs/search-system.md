# SmetaLabs — Система поиска

> **Последняя проверка:** 2026-05-22
>
> **Статус:** Поисковая инфраструктура находится на ранней стадии. Текущая реализация — клиентский URL-поиск через `?q=`. Серверный FTS, pgvector-эмбеддинги и гибридный поиск запланированы, но не реализованы.

---

## 1. Текущая реализация

### 1.1 Клиентский поиск в Directory-модулях

Единственная работающая поисковая механика — **URL-based фильтрация** в toolbar'ах directory-страниц. Реализована в `DirectoriesToolbar`.

**Файл:** `features/directories/components/directories-toolbar.tsx`

**Как работает:**

1. Пользователь вводит текст в поле поиска
2. При submit форма делает `router.replace()` с параметром `?q=...`
3. Страница перерендеривается, `searchParams.get("q")` читается на сервере
4. (В будущем) серверный/клиентский хук фильтрует данные по `q`

**Сигнатура:**

```tsx
type DirectoriesToolbarProps = {
  searchPlaceholder: string
  searchAriaLabel: string
  actions: DirectoryAction[]
}
```

**Пример использования (works-toolbar):**

```tsx
// features/directories/components/works-toolbar.tsx
export function WorksToolbar() {
  return (
    <DirectoriesToolbar
      searchPlaceholder="Поиск работ"
      searchAriaLabel="Поиск работ"
      actions={worksActions}
    />
  )
}
```

**Текущее ограничение:** данные захардкожены в `__mocks__/`, поиск только устанавливает URL-параметр. Фактическая фильтрация не выполняется.

### 1.2 SearchForm (сайдбар)

**Файл:** `features/search-form.tsx`

Простая форма поиска в сайдбаре — визуальный placeholder. Обёртка над `SidebarInput` с иконкой лупы. Не подключена к роутингу.

```tsx
export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  return (
    <form {...props}>
      <Label htmlFor="search" className="sr-only">Search</Label>
      <SidebarInput id="search" placeholder="Поиск..." className="h-8 pl-7" />
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
    </form>
  )
}
```

---

## 2. Планируемая архитектура (проект)

### 2.1 Уровни поиска

```
┌─────────────────────────────────────────────┐
│                  UI Layer                    │
│  SearchForm → URL params (?q=)              │
│  Quick search (debounced, suggestions)      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              Routing Layer                   │
│  Маршрутизация запроса по типу:              │
│  • exact match → прямой lookup              │
│  • fuzzy → FTS (pg_trgm)                    │
│  • semantic → pgvector (embeddings)         │
│  • hybrid → FTS + vector rerank            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│               Data Layer                     │
│  Supabase Postgres + pgvector + pg_trgm     │
│  Edge Function для генерации embeddings     │
└─────────────────────────────────────────────┘
```

### 2.2 Технологии

| Технология | Назначение | Статус |
|---|---|---|
| **pg_trgm** | Триграммный полнотекстовый поиск, нечёткий поиск по названиям, `ILIKE` с индексом | ❌ не подключён |
| **pgvector** | Векторное хранилище для семантического поиска (эмбеддинги OpenAI/Claude) | ❌ не подключён |
| **AI Embeddings** | Генерация эмбеддингов через Edge Function (OpenAI `text-embedding-3-small`) | ❌ не реализовано |
| **Гибридный поиск** | FTS + векторный поиск с переранжированием (RRF — Reciprocal Rank Fusion) | ❌ не реализовано |

### 2.3 pg_trgm — полнотекстовый поиск

**Планируемое расширение:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Индекс для ILIKE и нечёткого поиска
CREATE INDEX idx_works_title_trgm ON directory_works
  USING gin (title gin_trgm_ops);

-- Поиск по подстроке
SELECT * FROM directory_works
WHERE title ILIKE '%' || $query || '%'
ORDER BY similarity(title, $query) DESC
LIMIT 20;
```

**Когда использовать:** поиск по названиям работ, поставщиков, материалов. Быстрый, не требует эмбеддингов.

### 2.4 pgvector — семантический поиск

**Планируемое расширение:**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Колонка для эмбеддингов
ALTER TABLE directory_works
ADD COLUMN embedding vector(1536);

-- IVFFlat индекс (после наполнения данными)
CREATE INDEX idx_works_embedding ON directory_works
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**Edge Function для генерации эмбеддингов:**

```typescript
// supabase/functions/generate-embedding/index.ts
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

Deno.serve(async (req) => {
  const { text } = await req.json();
  const { data } = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return new Response(JSON.stringify({ embedding: data[0].embedding }));
});
```

**Когда использовать:** семантический поиск («штукатурка стен» найдёт «шпаклёвка поверхности»), рекомендации похожих работ.

### 2.5 Гибридный поиск

**Алгоритм RRF (Reciprocal Rank Fusion):**

```sql
-- Планируемый гибридный запрос
WITH fts_results AS (
  SELECT id, title,
    ts_rank(to_tsvector('russian', title), plainto_tsquery('russian', $query)) AS rank_fts
  FROM directory_works
  WHERE to_tsvector('russian', title) @@ plainto_tsquery('russian', $query)
  LIMIT 50
),
vector_results AS (
  SELECT id, title,
    1 - (embedding <=> $query_embedding) AS rank_vector
  FROM directory_works
  ORDER BY embedding <=> $query_embedding
  LIMIT 50
),
combined AS (
  SELECT COALESCE(f.id, v.id) AS id,
    COALESCE(f.title, v.title) AS title,
    COALESCE(1.0 / (30 + f.rank_fts), 0.0) AS rrf_fts,
    COALESCE(1.0 / (30 + v.rank_vector), 0.0) AS rrf_vector
  FROM fts_results f
  FULL OUTER JOIN vector_results v ON f.id = v.id
)
SELECT id, title, (rrf_fts + rrf_vector) AS score
FROM combined
ORDER BY score DESC
LIMIT 20;
```

**Когда использовать:** основной поисковый запрос пользователя — комбинирует точность FTS и семантическую релевантность.

### 2.6 Маршрутизация запросов

```typescript
// Планируемая логика маршрутизации
function routeQuery(query: string): SearchStrategy {
  // Точное совпадение (ID, код)
  if (/^[A-Z]{2}-\d{4}$/.test(query)) return "exact-lookup";

  // Короткий запрос → только FTS (быстрее)
  if (query.length < 3) return "fts-only";

  // Длинный описательный запрос → семантический
  if (query.split(" ").length > 4) return "semantic";

  // По умолчанию → гибридный
  return "hybrid";
}
```

---

## 3. Roadmap

| Этап | Что сделать | Приоритет |
|---|---|---|
| **1. Базовая фильтрация** | Подключить `?q=` к реальной фильтрации данных (в хуках `useDirectory*`) | P0 |
| **2. pg_trgm + индексы** | Подключить расширение, создать GIN-индексы, `ILIKE` поиск в API-роутах | P1 |
| **3. pgvector + embeddings** | Подключить расширение, Edge Function для OpenAI embeddings | P2 |
| **4. Гибридный поиск** | RRF-запрос, объединяющий FTS и векторный поиск | P2 |
| **5. Quick Search (debounced)** | Мгновенные подсказки при вводе, оптимистичные обновления | P3 |

---

> **Текущее состояние:** поиск существует только как UI-паттерн (URL-параметр `?q=`) без серверной обработки. Данные захардкожены в `__mocks__/`. Инфраструктура (pg_trgm, pgvector, embeddings) запланирована в проекте, но не реализована.
