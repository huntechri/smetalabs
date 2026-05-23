# Общая инфраструктура справочников (directories)

> 2026-05-22 · статус: production

---

## 1. Назначение

Модуль `directories` предоставляет **общие компоненты тулбаров** для всех справочников системы. Он не содержит бизнес-логики конкретных справочников — только переиспользуемую инфраструктуру поиска и кнопок действий.

Ключевая идея: каждый справочник (контрагенты, материалы, поставщики, работы) получает одинаковый тулбар с поиском и набором действий, специфичным для этого справочника.

### Что даёт модуль

- Единый компонент `DirectoriesToolbar` с полем поиска и группой кнопок действий
- Синхронизация поискового запроса с URL-параметром `?q=`
- Типизированный интерфейс `DirectoryAction` для описания кнопок
- Отдельные компоненты-обёртки для каждого справочника, передающие свои `actions`

### Важное разграничение

Модуль `features/directories/` — это **инфраструктура** (тулбары). Не путать с:

| Модуль | Назначение |
|---|---|
| `features/directories/` | **Общие тулбары** для всех справочников |
| `features/directory-works/` | Справочник работ (данные, страницы, CRUD) |
| `features/directory-materials/` | Справочник материалов (данные, страницы, CRUD) |
| `features/directory-suppliers/` | Справочник поставщиков (данные, страницы, импорт) |
| `features/directory-counterparties/` | Справочник контрагентов (данные, страницы, CRUD) |

---

## 2. Структура модуля

```
features/directories/
└── components/
    ├── directories-toolbar.tsx        # Базовый компонент тулбара (search + actions)
    ├── counterparties-toolbar.tsx     # Тулбар справочника контрагентов
    ├── materials-toolbar.tsx          # Тулбар справочника материалов
    ├── suppliers-toolbar.tsx          # Тулбар справочника поставщиков
    └── works-toolbar.tsx              # Тулбар справочника работ
```

Модуль не содержит хуков, моков, API-роутов или подпапок — только 5 компонентов.

---

## 3. Компоненты

### 3.1 `DirectoriesToolbar` — базовый тулбар

**Файл:** `features/directories/components/directories-toolbar.tsx`

Универсальный компонент, принимающий пропсы:

```typescript
export type DirectoryAction = {
  label: string                                          // Текст кнопки
  icon: React.ReactNode                                  // Иконка (Phosphor)
  variant?: React.ComponentProps<typeof Button>["variant"] // Вариант кнопки (default: outline)
  onClick?: () => void                                   // Обработчик клика
}

export type DirectoriesToolbarProps = {
  searchPlaceholder: string    // Placeholder поля поиска
  searchAriaLabel: string      // aria-label для поля поиска
  actions: DirectoryAction[]   // Список кнопок действий
}
```

**Состав тулбара:**

```
┌──────────────────────────────────────────────────────────────────┐
│ [🔍 Поиск...                    ] [Поиск] │ [➕ Добавить] [...]   │
│  ← форма поиска →                          ← ButtonGroup действий →
└──────────────────────────────────────────────────────────────────┘
```

- **Форма поиска** (рамка `border-sky-400`): поле ввода + кнопка «Поиск». На мобильных — только иконка `MagnifyingGlassIcon`, на `sm+` — текст «Поиск».
- **Группа действий** (рамка `border-teal-400`): `ButtonGroup` с `flex-wrap`, каждая кнопка рендерится из массива `actions`.
- **Адаптивность**: на `@4xl/main` тулбар переходит из вертикального в горизонтальный layout (`flex-col → flex-row`).

**Логика поиска:**

```typescript
// Синхронизация с URL
const searchParams = useSearchParams()
const [search, setSearch] = useState(searchParams.get("q") ?? "")

// Обновление при изменении URL-параметров
useEffect(() => {
  setSearch(searchParams.get("q") ?? "")
}, [searchParams])

// Сабмит формы → router.replace с ?q= или без
const handleSearch = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  const params = new URLSearchParams(searchParams.toString())
  const query = search.trim()
  if (query) params.set("q", query)
  else params.delete("q")
  router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname)
}
```

### 3.2 `CounterpartiesToolbar` — тулбар контрагентов

**Файл:** `features/directories/components/counterparties-toolbar.tsx`

```tsx
export function CounterpartiesToolbar() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <Suspense fallback={null}>
      <DirectoriesToolbar
        searchPlaceholder="Поиск контрагентов"
        searchAriaLabel="Поиск контрагентов"
        actions={[
          {
            label: "Добавить",
            icon: <PlusIcon data-icon="inline-start" />,
            onClick: () => setDialogOpen(true),
          },
        ]}
      />
      <DirectoryCounterpartiesCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Suspense>
  )
}
```

**Особенности:**
- Одна кнопка «Добавить» — открывает диалог создания контрагента
- Диалог `DirectoryCounterpartiesCreateDialog` рендерится здесь же (управление `open`/`onOpenChange`)
- Обёрнут в `<Suspense>` из-за использования `useSearchParams()` (требование Next.js App Router)

### 3.3 `MaterialsToolbar` — тулбар материалов

**Файл:** `features/directories/components/materials-toolbar.tsx`

```tsx
const materialsActions = [
  { label: "Добавить", icon: <PlusIcon data-icon="inline-start" /> },
  { label: "Импорт", icon: <FileArrowDownIcon data-icon="inline-start" /> },
  { label: "Экспорт", icon: <ExportIcon data-icon="inline-start" /> },
]

export function MaterialsToolbar() {
  return (
    <Suspense fallback={null}>
      <DirectoriesToolbar
        searchPlaceholder="Поиск материалов"
        searchAriaLabel="Поиск материалов"
        actions={materialsActions}
      />
    </Suspense>
  )
}
```

**Особенности:**
- Три кнопки: Добавить, Импорт, Экспорт
- Кнопки **не имеют обработчиков `onClick`** — на момент 2026-05-22 импорт/экспорт материалов не реализован (кнопки-заглушки)

### 3.4 `SuppliersToolbar` — тулбар поставщиков

**Файл:** `features/directories/components/suppliers-toolbar.tsx`

Идентичен `CounterpartiesToolbar` по структуре:
- Одна кнопка «Добавить»
- Открывает `DirectorySuppliersCreateDialog`
- Placeholder: «Поиск поставщиков»

### 3.5 `WorksToolbar` — тулбар работ

**Файл:** `features/directories/components/works-toolbar.tsx`

Идентичен `MaterialsToolbar` по структуре:
- Три кнопки: Добавить, Импорт, Экспорт
- Placeholder: «Поиск работ»
- Кнопки импорта/экспорта без обработчиков (заглушки)

---

## 4. Паттерн использования

Все справочники используют `DirectoriesToolbar` одинаково:

```
Страница справочника
  └─→ <Suspense>
        └─→ <XxxToolbar />          ← компонент из features/directories/
              └─→ <DirectoriesToolbar
                    searchPlaceholder="..."
                    searchAriaLabel="..."
                    actions={[...]}
                  />
```

Тулбар размещается **над таблицей/списком** справочника и управляет:
- **Поиском** — через `?q=` в URL (серверная фильтрация)
- **Действиями** — создание, импорт, экспорт

---

## 5. Зависимости

| Зависимость | Использование |
|---|---|
| `@/components/ui/button` | Кнопки действий |
| `@/components/ui/button-group` | Группировка кнопок |
| `@/components/ui/input` | Поле поиска |
| `@phosphor-icons/react` | Иконки (MagnifyingGlass, Plus, FileArrowDown, Export) |
| `next/navigation` | `usePathname`, `useRouter`, `useSearchParams` для синхронизации с URL |
| `features/directory-counterparties/` | Диалог создания контрагента |
| `features/directory-suppliers/` | Диалог создания поставщика |

---

## 6. Текущие ограничения

| Ограничение | Детали |
|---|---|
| **Нет обработчиков импорта/экспорта** | Кнопки «Импорт» и «Экспорт» в `MaterialsToolbar` и `WorksToolbar` — визуальные заглушки без `onClick` |
| **Только поиск синхронизирован с URL** | Фильтры (если появятся) не синхронизированы — паттерн есть только для `?q=` |
| **Нет компонента для `DirectoryToolbar` без поиска** | Все справочники получают поле поиска; если какому-то справочнику поиск не нужен — придётся создавать отдельный компонент |
| **Suspense required** | Каждый тулбар обязан быть обёрнут в `<Suspense>` из-за `useSearchParams()` — иначе Next.js выбрасывает ошибку при рендеринге |
| **Нет shared-состояния** | Каждый тулбар управляет своим `dialogOpen` локально — нет общей логики для диалогов создания |
