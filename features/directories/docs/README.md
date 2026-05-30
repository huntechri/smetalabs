# Общая инфраструктура справочников (directories)

> 2026-05-30 · статус: полностью реализована и декомпозирована по **4-слойному стандарту** (`model`, `application`, `ui`). [Epic #196](https://github.com/huntechri/smetalabs/issues/196).

---

## 1. Назначение

Модуль `directories` предоставляет **общую инфраструктуру** для всех справочников системы: тулбары, парсинг CSV и доменные типы. Он не содержит бизнес-логики конкретных справочников — только переиспользуемую инфраструктуру поиска, категориальной фильтрации и импорта данных.

Ключевая идея: каждый справочник (контрагенты, материалы, поставщики, работы) получает одинаковый тулбар с поиском и набором действий, специфичным для этого справочника.

### Что даёт модуль

- **`model/`** — чистые типы и нормализующие хелперы для CSV-импорта (без зависимостей от React).
- **`application/`** — `AsyncGenerator`-парсер CSV-файлов для пошагового мастера импорта.
- **`ui/`** — компоненты тулбаров: единый `DirectoriesToolbar` и специфичные обёртки для каждого справочника.

### Важное разграничение

Модуль `features/directories/` — это **инфраструктура** (тулбары + CSV). Не путать с:

| Модуль | Назначение |
|---|---|
| `features/directories/` | **Общие тулбары, CSV-парсер** для всех справочников |
| `features/directory-works/` | Справочник работ (данные, страницы, CRUD) |
| `features/directory-materials/` | Справочник материалов (данные, страницы, CRUD) |
| `features/directory-suppliers/` | Справочник поставщиков (данные, страницы, импорт) |
| `features/directory-counterparties/` | Справочник контрагентов (данные, страницы, CRUD) |

---

## 2. Структура модуля

```
features/directories/
├── model/
│   ├── csv-import.ts           # Чистые хелперы нормализации CSV (normalizeHeader, normalizeCellValue)
│   ├── csv-import.test.ts      # Unit-тесты нормализаторов
│   └── directories-model.ts   # Общие доменные типы (DirectoryAction, DirectoriesToolbarProps)
├── application/
│   └── csv-parser.ts          # AsyncGenerator-парсер для пошагового CSV-импорта
├── ui/
│   ├── directories-toolbar.tsx        # Базовый компонент тулбара (search + actions + children)
│   ├── counterparties-toolbar.tsx     # Тулбар справочника контрагентов
│   ├── materials-toolbar.tsx          # Тулбар справочника материалов (+ фильтр категорий)
│   ├── suppliers-toolbar.tsx          # Тулбар справочника поставщиков
│   └── works-toolbar.tsx              # Тулбар справочника работ (+ фильтр категорий)
└── docs/
    └── README.md
```

> **Примечание:** слой `api/` в данном модуле отсутствует — модуль является чисто инфраструктурным и не делает собственных сетевых запросов.

---

## 3. Слой `model/`

### `csv-import.ts` — нормализация CSV

Чистые TypeScript-функции без зависимостей от React и браузера:

```typescript
// Нормализует заголовок колонки CSV → строчные буквы без пробелов
normalizeHeader(header: string): string

// Нормализует значение ячейки → строка или null
normalizeCellValue(value: string | undefined | null): string | null
```

Покрыты unit-тестами в `model/csv-import.test.ts`.

### `directories-model.ts` — доменные типы

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

---

## 4. Слой `application/`

### `csv-parser.ts` — парсер CSV

Реализует `AsyncGenerator<ParsedRow>` для пошагового чтения CSV-файла потоком. Используется диалогами импорта в `features/directory-materials/` и `features/directory-works/`.

```typescript
// Парсит File → асинхронный генератор строк
async function* parseCsvFile(file: File): AsyncGenerator<CsvRow>
```

---

## 5. Слой `ui/`

### `DirectoriesToolbar` — базовый тулбар

**Файл:** `features/directories/ui/directories-toolbar.tsx`

Универсальный компонент. Принимает пропсы `DirectoriesToolbarProps` из `model/directories-model.ts`.

### `CounterpartiesToolbar`

**Файл:** `features/directories/ui/counterparties-toolbar.tsx`  
Содержит кнопку «Добавить», открывающую диалог создания контрагента `DirectoryCounterpartiesCreateDialog`.

### `MaterialsToolbar`

**Файл:** `features/directories/ui/materials-toolbar.tsx`  
Кнопки: **Фильтр** (категории), **Добавить**, **Импорт** (CSV-мастер), **Экспорт** (XLSX).

### `SuppliersToolbar`

**Файл:** `features/directories/ui/suppliers-toolbar.tsx`  
Кнопка создания поставщика с модальным диалогом `DirectorySuppliersCreateDialog`.

### `WorksToolbar`

**Файл:** `features/directories/ui/works-toolbar.tsx`  
Аналогичен `MaterialsToolbar`: фильтр категорий, добавление, импорт и экспорт работ.

---

## 6. Паттерн использования

Все справочники используют `DirectoriesToolbar` одинаково:

```
Страница справочника
  └─→ <Suspense>
        └─→ <XxxToolbar />          ← компонент из features/directories/ui/
              └─→ <DirectoriesToolbar
                    searchPlaceholder="..."
                    searchAriaLabel="..."
                    actions={[...]}
                  >
                     <CategoryFilter />
                  </DirectoriesToolbar>
```

---

## 7. Текущее состояние

| Задача | Статус | Комментарий |
|---|---|---|
| **4-слойная декомпозиция** | ✅ Готова | `model`, `application`, `ui` — разделены согласно стандарту. |
| **Универсальный Toolbar** | ✅ Готов | Единый интерфейс поиска и кнопок действий. |
| **Связь с URL** | ✅ Готова | Поиск `?q=` синхронизирован с параметрами адресной строки. |
| **Интеграция событий** | ✅ Готова | Кнопки добавления/импорта/экспорта связаны с обработчиками через события. |
| **Фильтры категорий** | ✅ Готовы | Поддержка выпадающих панелей категориальных фильтров. |
| **CSV-нормализация** | ✅ Готова | Чистые хелперы в `model/csv-import.ts` с unit-тестами. |
| **CSV-парсер** | ✅ Готов | `AsyncGenerator` в `application/csv-parser.ts` для импорта. |
