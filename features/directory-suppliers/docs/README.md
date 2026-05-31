# Справочник поставщиков (directory-suppliers)

> Статус: production | feature layers migrated | 2026-05-31

## Назначение

Управление справочником поставщиков — юридических и физических лиц, у которых закупаются
материалы и работы. Модуль предоставляет просмотр списка, поиск, создание, редактирование
и архивирование записей с полной интеграцией через API и TanStack Query.

**Маршрут:** `/directories/suppliers`  
**Страница:** `app/(main)/directories/suppliers/page.tsx`

## Структура модуля

```
features/directory-suppliers/
├── api/
│   ├── directory-suppliers-client.ts       # HTTP/API adapters: fetch, create, update, archive
│   ├── directory-suppliers-query-keys.ts   # Ключи кэширования и теги инвалидации
│   └── directory-suppliers-errors.ts       # Ошибки API-клиента
├── application/
│   └── use-directory-suppliers.ts          # Use-case orchestration: TanStack Query + mutations
├── model/
│   ├── directory-suppliers-model.ts        # Типы, constants, form mapping, selectors, URL params parsing
│   └── directory-suppliers-model.test.ts   # Unit-тесты чистой модели
├── ui/
│   ├── directory-suppliers-view.tsx        # Layout-обёртка со скроллом
│   ├── directory-suppliers-section.tsx     # Список, pagination UI, dialog orchestration
│   ├── directory-suppliers-row.tsx         # Строка: имя + цвет + статус + контакты
│   ├── directory-suppliers-name.tsx        # Отображение наименования
│   ├── directory-suppliers-value.tsx       # Бейдж «label: value»
│   ├── directory-suppliers-metric-group.tsx# Группа метрик с заголовком
│   └── directory-suppliers-create-dialog.tsx# Диалог создания/редактирования
├── hooks/
│   └── use-directory-suppliers.ts          # Compatibility export на application hook
├── components/
│   └── directory-suppliers-view.tsx        # Compatibility export на ui view
├── directory-suppliers-details/
│   └── components/                         # Compatibility exports на ui components
├── server/
│   ├── directory-suppliers.route-handlers.ts
│   ├── directory-suppliers.schemas.ts
│   ├── directory-suppliers.service.ts
│   └── directory-suppliers.repository.ts
└── types.ts                                # Compatibility re-export типов из model

app/api/directory-suppliers/
├── route.ts                                # GET (список), POST (создание)
└── [id]/route.ts                           # GET (детали), PATCH (обновление), DELETE (архивирование)
```

## Слои

- `ui` — JSX, layout, формы, модалки, локальный визуальный state и вызов команд.
- `model` — чистые типы, constants, form mapping, label helpers, HEX validation, URL params parsing.
- `application` — сценарии загрузки/создания/обновления/архивирования, TanStack Query и invalidation.
- `api` — HTTP-доступ к `/api/directory-suppliers`, error adapter и backend contracts.

## Данные

### TypeScript: `DirectorySupplier`

```typescript
export type DirectorySupplier = {
  id: string
  name: string
  normalizedName: string
  legalStatus: "juridical" | "individual"
  color: string
  inn: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  status: "active" | "archived"
  version: number
  metadata: {
    createdAt: string
    updatedAt: string
  }
}
```

### `DirectorySuppliersListParams`

```typescript
export type DirectorySuppliersListParams = {
  q?: string
  status?: "active" | "archived"
  limit?: number
  cursor?: number
  sort?: "relevance" | "updated_desc" | "name_asc"
}
```

### `DirectorySupplierMutationInput`

```typescript
export type DirectorySupplierMutationInput = {
  name: string
  legalStatus: "juridical" | "individual"
  color?: string | null
  inn?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}
```

## API

Все backend contracts сохранены без изменений.

| Метод | Путь | Назначение |
|-------|------|------------|
| `GET` | `/api/directory-suppliers` | Список поставщиков с пагинацией, поиском, сортировкой и фильтрацией по статусу |
| `POST` | `/api/directory-suppliers` | Создание нового поставщика |
| `GET` | `/api/directory-suppliers/[id]` | Детали одного поставщика |
| `PATCH` | `/api/directory-suppliers/[id]` | Обновление существующего поставщика |
| `DELETE` | `/api/directory-suppliers/[id]` | Soft-delete / архивирование |

## Поведение

Behavior changes: none.

Сохранены:

- поля поставщика;
- контакты, реквизиты и правила отображения;
- поиск, фильтрация, пагинация;
- создание, редактирование и архивирование;
- текущие HTTP/backend contracts.
