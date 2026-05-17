# Directory materials UI

> Last updated: 2026-05-17
>
> Status: current UI contract for `/directories/materials`.
>
> Base reference: `/directories/works` and `docs/directory-module-standard.md`.

This document records the current UI behavior for the materials directory.

The materials section should visually follow the works directory where the same interaction exists, while keeping material-specific fields and behavior.

---

## Scope

This document covers only the UI layer of `/directories/materials` and the filter value contract used by that UI.

It does not redefine database structure, permissions, import storage, or material import performance rules.

---

## Toolbar

The materials toolbar uses the shared directory toolbar pattern.

Required actions:

```txt
Фильтр
Добавить
Импорт
Экспорт
```

Search uses the placeholder:

```txt
Поиск материалов
```

The filter button toggles the materials filter panel. Search and filter changes must reset pagination by removing `cursor` from the URL query.

---

## Filter panel

The filter panel contains:

```txt
category
subcategory
supplier
reset
```

User-facing labels:

```txt
Все категории
Все подкатегории
Все поставщики
Сбросить
```

Behavior:

- categories are loaded as the global active category list;
- subcategories are shown only after category selection;
- suppliers are loaded for the current selected category and subcategory;
- changing category clears subcategory, supplier, and cursor;
- changing subcategory clears supplier and cursor;
- changing supplier clears cursor;
- reset clears category, subcategory, supplier, and cursor.

Important rule: supplier values must be scoped to the current filter level. If a user chooses a category or subcategory, the supplier dropdown must show only suppliers that have materials in that selected scope.

---

## List container

The list area uses the shared card-style directory container.

Required states:

```txt
loading
empty
error
list
pagination
```

Empty state text:

```txt
Материалы не найдены
Добавьте первый материал вручную или измените поиск.
```

Pagination text shows the visible range and total count. Pagination buttons are:

```txt
Назад
Вперёд
```

---

## Row layout

Material rows follow the same visual structure as works rows.

The outer row is a bordered grid block. It is not wrapped in a generic card component.

The row has two main sections:

```txt
left section  → identity fields
right section → metrics, classification, image, actions
```

Identity section:

```txt
КОД
НАЗВАНИЕ
```

Each identity field must have its own bordered inner block.

Metric/classification section:

```txt
ЕД. ИЗМ / ЦЕНА
КАТЕГОРИЯ / ПОСТАВЩИК
```

Each metric group must have its own bordered inner block.

Heading typography follows the works row pattern:

```txt
text-xs text-muted-foreground uppercase
```

The visible heading text is rendered in caps:

```txt
КОД
НАЗВАНИЕ
ЕД. ИЗМ / ЦЕНА
КАТЕГОРИЯ / ПОСТАВЩИК
```

Value typography:

```txt
code  → font-mono text-xs font-medium leading-snug
name  → text-sm font-medium leading-snug
```

Material values use shared UI primitives where appropriate:

```txt
Badge
Button
DropdownMenu
```

Do not reintroduce local material-only primitives for simple value chips or row action controls unless the design system gains no equivalent.

---

## Row actions

Every active material row exposes the standard row action menu:

```txt
Добавить ниже
Редактировать
Архивировать
```

The action button uses the shared button and dropdown primitives.

Actions must be disabled while a save or list refresh is running.

---

## Form dialog

The create/edit dialog uses shared form primitives:

```txt
FieldGroup
Field
FieldLabel
FieldError
Input
Dialog
Button
```

Required fields:

```txt
Название
Ед. изм.
Цена
Категория
```

Optional fields:

```txt
Подкатегория
Код
Поставщик
```

The dialog title is:

```txt
Новый материал
Редактировать материал
Новый материал ниже
```

`Новый материал ниже` is used when the user starts creation through the row action `Добавить ниже`.

---

## Loading skeleton

The loading skeleton must match the ready row layout.

If the ready row has separate bordered sections for identity and metrics, the skeleton must keep the same section structure to avoid visual jumps when data loads.

---

## Implementation notes

Current UI ownership:

```txt
features/directories/components/materials-toolbar.tsx
features/directory-materials/components/directory-materials-view.tsx
features/directory-materials/components/directory-materials-category-filter.tsx
features/directory-materials/directory-materials-details/components/directory-materials-section.tsx
features/directory-materials/directory-materials-details/components/directory-materials-row.tsx
features/directory-materials/directory-materials-details/components/directory-material-form-dialog.tsx
```

The materials UI must remain directory-specific. It should not import row components from works, and it should not depend on works routes or works data names.
