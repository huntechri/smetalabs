# Общая инфраструктура справочников (directories)

> 2026-05-23 · статус: полностью реализована (инфраструктура тулбаров, интеграция фильтрации категорий и событий создания/импорта/экспорта).

---

## 1. Назначение

Модуль `directories` предоставляет **общие компоненты тулбаров** для всех справочников системы. Он не содержит бизнес-логики конкретных справочников — только переиспользуемую инфраструктуру поиска, категориальной фильтрации и кнопок действий.

Ключевая идея: каждый справочник (контрагенты, материалы, поставщики, работы) получает одинаковый тулбар с поиском и набором действий, специфичным для этого справочника.

### Что даёт модуль

- Единый компонент `DirectoriesToolbar` с полем поиска и группой кнопок действий.
- Синхронизация поискового запроса с URL-параметром `?q=`.
- Типизированный интерфейс `DirectoryAction` для описания кнопок (поддержка `onClick`, иконок, кастомных вариантов кнопок).
- Отдельные компоненты-обёртки для каждого справочника, передающие свои `actions` и фильтры по категориям.

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
    ├── directories-toolbar.tsx        # Базовый компонент тулбара (search + actions + children)
    ├── counterparties-toolbar.tsx     # Тулбар справочника контрагентов
    ├── materials-toolbar.tsx          # Тулбар справочника материалов с поддержкой категориального фильтра
    ├── suppliers-toolbar.tsx          # Тулбар справочника поставщиков
    └── works-toolbar.tsx              # Тулбар справочника работ с поддержкой категориального фильтра
```

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
  hideLabel?: boolean                                    // Скрыть подпись
  onClick?: () => void                                   // Обработчик клика
  title?: string                                         // Всплывающая подсказка
}

export type DirectoriesToolbarProps = {
  searchPlaceholder: string    // Placeholder поля поиска
  searchAriaLabel: string      // aria-label для поля поиска
  actions: DirectoryAction[]   // Список кнопок действий
  children?: React.ReactNode   // Дополнительный контент (например, фильтр категорий)
}
```

### 3.2 `CounterpartiesToolbar` — тулбар контрагентов

**Файл:** `features/directories/components/counterparties-toolbar.tsx`
Содержит кнопку «Добавить», открывающую диалог создания контрагента `DirectoryCounterpartiesCreateDialog`.

### 3.3 `MaterialsToolbar` — тулбар материалов

**Файл:** `features/directories/components/materials-toolbar.tsx`
Предоставляет кнопки:
- **Фильтр** — переключает отображение компонента категорий `DirectoryMaterialsCategoryFilter`.
- **Добавить** — триггерит событие создания нового материала.
- **Импорт** — открывает пошаговый мастер импорта CSV.
- **Экспорт** — экспортирует справочник в XLSX.

### 3.4 `SuppliersToolbar` — тулбар поставщиков

**Файл:** `features/directories/components/suppliers-toolbar.tsx`
Предоставляет кнопку создания поставщика с модальным диалогом `DirectorySuppliersCreateDialog`.

### 3.5 `WorksToolbar` — тулбар работ

**Файл:** `features/directories/components/works-toolbar.tsx`
Аналогичен тулбару материалов: содержит фильтр категорий `DirectoryWorksCategoryFilter`, кнопки добавления, импорта и экспорта работ справочника.

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
                  >
                     <CategoryFilter />
                  </DirectoriesToolbar>
```

---

## 5. Текущее состояние

| Задача | Статус | Комментарий |
|---|---|---|
| **Универсальный Toolbar** | ✅ Готов | Обеспечивает единый интерфейс поиска и кнопок действий. |
| **Связь с URL** | ✅ Готова | Поиск `?q=` синхронизирован с параметрами адресной строки. |
| **Интеграция событий** | ✅ Готова | Кнопки добавления, импорта и экспорта связаны с соответствующими обработчиками через глобальные шины событий/клиентские хелперы. |
| **Фильтры категорий** | ✅ Готовы | Внедрена поддержка выпадающих панелей категориальных фильтров. |
