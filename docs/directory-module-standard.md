# SmetaLabs — Стандарт построения Directory-модулей

> **Последняя проверка:** 2026-05-22
>
> **На основе:** анализа трёх реализованных модулей: `directory-works`, `directory-suppliers`, `directory-counterparties`.

---

## 1. Общая архитектура

Каждый directory-модуль — это **feature-директория** под `features/`. Все модули следуют единому шаблону.

### 1.1 Структура модуля

```
features/directory-{entity}/
├── components/
│   └── directory-{entity}-view.tsx          # Входная точка модуля
├── directory-{entity}-details/
│   └── components/
│       ├── directory-{entity}-section.tsx    # Контейнер списка
│       ├── directory-{entity}-row.tsx        # Одна строка
│       ├── directory-{entity}-name.tsx       # Отображение имени
│       ├── directory-{entity}-value.tsx      # Отображение значения
│       ├── directory-{entity}-metric-group.tsx # Группа метрик
│       └── directory-{entity}-create-dialog.tsx # Диалог создания
├── hooks/
│   └── use-directory-{entity}.ts            # Хук данных
└── __mocks__/
    └── directory-{entity}.ts                # Мок-данные
```

**Связанные файлы за пределами модуля:**

```
types/
└── directory-{entity}.ts                    # Типы (вне модуля)
features/directories/components/
└── {entity}-toolbar.tsx                     # Тулбар (общий компонент DirectoriesToolbar)
```

---

## 2. Обязательные слои

### 2.1 Слой типов (`types/directory-{entity}.ts`)

Каждый модуль определяет тип строки. Тип вынесен в общую папку `types/`.

**Пример (`types/directory-work.ts`):**

```typescript
export type DirectoryWorkRow = {
  id: string
  title: string
  unit: string
  rate: number
  category: string
}
```

**Контракт:** тип должен экспортироваться как `Directory{Entity}Row`.

### 2.2 Слой хука (`hooks/use-directory-{entity}.ts`)

Единая точка получения данных. **Сейчас использует мок-данные**, в будущем — Supabase-запросы.

**Сигнатура:**

```typescript
export function useDirectory{Entity}() {
  // Сейчас: импорт из __mocks__
  // В будущем: useQuery / supabase.from(...)
  return { entities: rows }
}
```

**Пример (`hooks/use-directory-works.ts`):**

```typescript
import { directoryWorkRows } from "@/features/directory-works/__mocks__/directory-works"

export function useDirectoryWorks() {
  return { works: directoryWorkRows }
}
```

**Контракт:**
- Название: `useDirectory{Entity}()`
- Возвращает объект с коллекцией (множественное число `{entities}`)
- В будущем: добавит `isLoading`, `error`, `isEmpty`

### 2.3 Слой моков (`__mocks__/directory-{entity}.ts`)

Статические тестовые данные. Экспортирует массив строк типа `Directory{Entity}Row[]`.

**Контракт:**
- Название переменной: `directory{Entity}Rows`
- Минимум 8–10 записей для тестирования UI

### 2.4 Слой View (`components/directory-{entity}-view.tsx`)

Входная точка модуля. Обёртка с layout-разметкой и скроллом.

**Пример:**

```tsx
import { DirectoryWorksSection } from "@/features/directory-works/directory-works-details/components/directory-works-section"

export function DirectoryWorksView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-500 p-1">
        <DirectoryWorksSection />
      </div>
    </div>
  )
}
```

**Контракт:**
- Название: `Directory{Entity}View`
- Layout: `flex h-full min-h-0 flex-1 flex-col` + `scrollbar-subtle overflow-y-auto`
- Делегирует контент в `Directory{Entity}Section`

### 2.5 Слой Section (`directory-{entity}-details/components/directory-{entity}-section.tsx`)

Контейнер списка. Получает данные из хука, маппит на строки.

**Пример:**

```tsx
"use client"

import { useDirectoryWorks } from "@/features/directory-works/hooks/use-directory-works"
import { DirectoryWorksRow } from "./directory-works-row"

export function DirectoryWorksSection() {
  const { works } = useDirectoryWorks()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {works.map((row) => (
          <DirectoryWorksRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
```

**Контракт:**
- `"use client"` (клиентский компонент)
- Название: `Directory{Entity}Section`
- Использует хук `useDirectory{Entity}()`
- Маппит данные → `Directory{Entity}Row`

**Обязательные состояния (будущая реализация):**

| Состояние | Условие | Как отображать |
|---|---|---|
| **Loading** | `isLoading === true` | `<Skeleton />` повторяющиеся строки |
| **Empty** | `entities.length === 0 && !isLoading` | `<Empty>` с иконкой и призывом к созданию |
| **Error** | `error !== null` | `<Empty variant="icon">` с текстом ошибки и кнопкой Retry |
| **Data** | `entities.length > 0` | Список `Directory{Entity}Row` |

**Планируемый шаблон с состояниями:**

```tsx
export function DirectoryWorksSection() {
  const { works, isLoading, error } = useDirectoryWorks()

  if (isLoading) {
    return (
      <section className="flex flex-col overflow-hidden rounded-lg border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b p-3">
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </section>
    )
  }

  if (error) {
    return (
      <Empty>
        <EmptyMedia variant="icon"><WarningIcon /></EmptyMedia>
        <EmptyTitle>Ошибка загрузки</EmptyTitle>
        <EmptyDescription>{error.message}</EmptyDescription>
        <EmptyContent>
          <Button onClick={refetch}>Повторить</Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (works.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon"><FolderIcon /></EmptyMedia>
        <EmptyTitle>Нет работ</EmptyTitle>
        <EmptyDescription>Добавьте первую работу в справочник</EmptyDescription>
        <EmptyContent>
          <Button>Добавить работу</Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {works.map((row) => (
          <DirectoryWorksRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
```

### 2.6 Слой Row (`directory-{entity}-details/components/directory-{entity}-row.tsx`)

Одна строка данных. Двухколоночный адаптивный layout.

**Пример (`directory-works-row.tsx`):**

```tsx
export function DirectoryWorksRow({ row }: { row: DirectoryWorkRow }) {
  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        {/* Левая колонка: название */}
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <DirectoryWorksName value={row.title} />
        </div>

        {/* Правая колонка: метрики */}
        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
          <DirectoryWorksMetricGroup title="Ед. изм">
            <DirectoryWorksValue label="Ед." value={row.unit} />
          </DirectoryWorksMetricGroup>
          {/* ... */}
        </div>
      </div>
    </div>
  )
}
```

**Контракт:**
- Пропсы: `{ row: Directory{Entity}Row }`
- Layout: `lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]`
- Левая колонка — название, правая — метрики
- `hover:bg-muted/50` на контейнере
- Использует подкомпоненты: `Name`, `Value`, `MetricGroup`

### 2.7 Подкомпоненты

#### Name — отображение имени

```tsx
export function DirectoryWorksName({ value }: { value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-dashed border-green-300 p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">Название</span>
      <div className="break-words text-sm font-medium leading-snug">{value}</div>
    </div>
  )
}
```

#### Value — отображение значения с бейджем

```tsx
export function DirectoryWorksValue({
  className, label, strong = false, value,
}: {
  className?: string
  label: string
  strong?: boolean
  value: number | string
}) {
  return (
    <Badge variant="outline" className={cn(
      "gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums",
      strong && "font-semibold",
      className
    )}>
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
    </Badge>
  )
}
```

#### MetricGroup — группа метрик

```tsx
export function DirectoryWorksMetricGroup({
  children, title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-dashed border-emerald-400 p-1.5">
      <div className="text-xs font-semibold text-muted-foreground uppercase">{title}</div>
      <div className="flex min-w-0 flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
```

### 2.8 Слой CreateDialog

Диалог создания новой записи. Использует shadcn `Dialog` + `Select` + `Input`.

**Сигнатура:**

```tsx
export function DirectorySuppliersCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
})
```

**Контракт:**
- Управляется через пропсы `open` / `onOpenChange` (Controlled)
- Использует локальный `useState` для каждого поля
- `DialogContent` с `className="sm:max-w-md"`
- Поля: `<Label>` + `<Input>` или `<Select>`
- Footer: кнопки «Отмена» и «Создать»
- `handleCreate` — заглушка с `// TODO: implement save logic`

### 2.9 Слой Toolbar

Тулбар страницы справочника. **Использует общий компонент `DirectoriesToolbar`.**

```tsx
// features/directories/components/works-toolbar.tsx
export function WorksToolbar() {
  return (
    <Suspense fallback={null}>
      <DirectoriesToolbar
        searchPlaceholder="Поиск работ"
        searchAriaLabel="Поиск работ"
        actions={worksActions}
      />
    </Suspense>
  )
}
```

**Контракт:**
- Оборачивает `DirectoriesToolbar` в `<Suspense>` (использует `useSearchParams`)
- Передаёт `searchPlaceholder`, `searchAriaLabel`, `actions`
- `actions` — массив `DirectoryAction[]` с `label`, `icon`, `variant?`, `onClick?`

---

## 3. Импорт/экспорт стандарт

### 3.1 Именование

| Элемент | Паттерн |
|---|---|
| Тип строки | `Directory{Entity}Row` |
| Хук | `useDirectory{Entity}()` |
| View | `Directory{Entity}View` |
| Section | `Directory{Entity}Section` |
| Row | `Directory{Entity}Row` |
| Name | `Directory{Entity}Name` |
| Value | `Directory{Entity}Value` |
| MetricGroup | `Directory{Entity}MetricGroup` |
| CreateDialog | `Directory{Entity}CreateDialog` |
| Toolbar | `{Entity}Toolbar` |
| Мок-переменная | `directory{Entity}Rows` |

Где `{Entity}` — PascalCase: `Works`, `Suppliers`, `Counterparties`, `Materials`.

### 3.2 Пути импорта

```typescript
// ✅ Из своего модуля
import { DirectoryWorksRow } from "@/features/directory-works/directory-works-details/components/directory-works-row"

// ✅ Типы — из общей папки
import type { DirectoryWorkRow } from "@/types/directory-work"

// ✅ shadcn — из components/ui/
import { Badge } from "@/components/ui/badge"

// ✅ Хук — из своего модуля
import { useDirectoryWorks } from "@/features/directory-works/hooks/use-directory-works"
```

---

## 4. Чеклист при создании нового модуля

1. [ ] Создать тип `Directory{Entity}Row` в `types/directory-{entity}.ts`
2. [ ] Создать мок-данные в `features/directory-{entity}/__mocks__/directory-{entity}.ts`
3. [ ] Реализовать хук `useDirectory{Entity}()` с возвратом моков
4. [ ] Реализовать `Directory{Entity}Name` (один файл)
5. [ ] Реализовать `Directory{Entity}Value` (один файл)
6. [ ] Реализовать `Directory{Entity}MetricGroup` (один файл)
7. [ ] Реализовать `Directory{Entity}Row` (композиция Name + MetricGroup + Value)
8. [ ] Реализовать `Directory{Entity}Section` (список строк)
9. [ ] Реализовать `Directory{Entity}View` (layout-обёртка)
10. [ ] Реализовать `Directory{Entity}CreateDialog` (опционально)
11. [ ] Создать `{entity}-toolbar.tsx` в `features/directories/components/`
12. [ ] Подключить View и Toolbar на страницу справочника

---

## 5. Ссылки

- **Архитектура directory-works:** `features/directory-works/` (эталонный модуль)
- **Текущее состояние:** все три модуля используют мок-данные. Состояния loading/empty/error не реализованы — только happy path.
- **Устаревшая документация:** ранее `docs/directory-works-architecture.md` — заменён на `features/directory-works/docs/README.md` (не создан).

---

> **Кратко:** Все directory-модули строятся по единому шаблону: тип → мок → хук → View → Section → Row → (Name + Value + MetricGroup) → Toolbar. Именование строго по паттерну `Directory{Entity}{Component}`.
