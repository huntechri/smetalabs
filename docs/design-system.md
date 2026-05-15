# SmetaLabs — Design System

> Last updated: 2026-05-15
>
> Scope: production UI rules for the current Next.js 16 + React 19 + Tailwind v4 + shadcn/ui codebase.

This document is the single source of truth for UI implementation. Do not create parallel design-system documents. When UI rules change, update this file.

---

## 1. Core principles

1. Use `components/ui` primitives directly.
2. Do not create local primitives inside feature folders.
3. Compose feature-specific UI in `features/**` from shared primitives.
4. Use Tailwind utility classes and semantic design tokens only.
5. Do not hardcode colors, fonts, shadows or one-off CSS.
6. Keep production screens free from debug-only visual wrappers.

Allowed feature composition:

```tsx
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

function FeatureSpecificRowsSkeleton() {
  return <Skeleton className="h-4 w-32" />
}
```

Forbidden local primitives:

```tsx
function LocalButton() {}
function LocalDropdown() {}
function LocalSpinner() {}
function LocalInput() {}
```

---

## 2. UI primitive ownership

### `components/ui`

Reserved for shadcn/ui primitives and project-approved primitive extensions.

Rules:

- no business logic;
- no API calls;
- no feature labels;
- no feature-specific state;
- no imports from `features/**` or `app/**`;
- may import `cn` from `@/lib/utils`;
- should follow the existing shadcn file style, including explicit React type imports when needed.

Examples:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"
```

### `features/**`

Feature folders own screen-specific composition.

Allowed:

- feature-specific rows;
- feature-specific skeleton layouts;
- dialogs composed from shared dialog primitives;
- toolbar composition using shared buttons, inputs and menus;
- list/table/card layouts using semantic tokens.

Not allowed:

- local replacements for `Button`, `Input`, `Select`, `DropdownMenu`, `Dialog`, `Table`, `Badge`, `Skeleton`, `Spinner`;
- local SVG loaders or `animate-spin` loaders;
- local style systems.

---

## 3. Tokens and styling

Use semantic Tailwind classes mapped to CSS variables from `app/globals.css`.

Correct:

```tsx
<div className="border border-border bg-card text-card-foreground" />
<p className="text-xs/relaxed text-muted-foreground" />
<Button variant="outline" size="sm" />
```

Incorrect:

```tsx
<div className="border-red-500 bg-[#ffffff]" />
<div style={{ color: "#7c3aed" }} />
```

Current required token families:

| Purpose | Use |
|---|---|
| Page background | `bg-background`, `text-foreground` |
| Card/list surface | `bg-card`, `text-card-foreground` |
| Muted surfaces | `bg-muted`, `text-muted-foreground` |
| Borders | `border-border` |
| Inputs | `border-input` or shared `Input` |
| Errors/destructive | `text-destructive`, `border-destructive`, destructive variants |
| Focus ring | component-provided `ring`/`focus-visible` states |

No component should hardcode oklch, hex, RGB or named colors.

---

## 4. Typography

Global font is applied at the app root. Feature components should not set custom font families unless the design system explicitly exposes a token.

Current convention:

| Use | Class |
|---|---|
| Compact body/helper text | `text-xs/relaxed` |
| Small labels | `text-xs text-muted-foreground uppercase` |
| Inputs and dialog titles | existing shared component defaults |
| Emphasis | prefer `font-medium` |
| Strong exceptional emphasis | use only when the design needs a visible hierarchy jump |
| Mono codes | `font-mono` |

Avoid inconsistent local typography. If several labels belong to one visual row, use the same label style across all groups.

---

## 5. Spacing, borders and layout

Use Tailwind spacing scale only.

Common compact rhythm:

| Use | Class |
|---|---|
| Tight internal group gap | `gap-1.5` |
| Regular control gap | `gap-2` |
| Compact padding | `p-1.5`, `p-2` |
| Card/list padding | `p-3`, `p-4` |
| Compact row outer rhythm | `mx-3 my-1.5` |

Borders must be semantic:

```tsx
<div className="rounded-md border border-border" />
```

Debug-only colored borders and debug divs must not remain in production UI. If a former debug boundary is still useful, convert it to `border border-border` and keep only the wrapper that represents a real visual group.

---

## 6. Loading states

### 6.1 Preferred default: Skeleton for structured content

For lists, tables, card grids and structured detail panels, use `Skeleton` from `@/components/ui/skeleton`.

Skeletons should mirror the final layout:

- same outer rhythm;
- same major borders;
- same grid/flex structure;
- same approximate density;
- no business text;
- no hardcoded colors.

Feature-specific skeleton composition is allowed when the layout is feature-specific, but every placeholder must use the shared `Skeleton` primitive.

```tsx
import { Skeleton } from "@/components/ui/skeleton"

function RowsSkeleton() {
  return (
    <div aria-label="Загрузка" aria-busy="true">
      <div className="rounded-md border border-border p-3">
        <Skeleton className="mb-2 h-3 w-16" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    </div>
  )
}
```

### 6.2 Spinner usage

`Spinner` exists as a shared primitive in `@/components/ui/spinner`, but it is not the default for structured screens.

Use spinner only for:

- small inline action states;
- compact dialog actions;
- operations where the resulting layout is unknown.

Do not use spinner for structured catalogs/lists when a skeleton can show the expected content shape.

Forbidden:

```tsx
<div className="animate-spin" />
```

### 6.3 Refresh loading

For search and pagination in structured lists, prefer replacing the rows area with skeleton rows. Do not show stale rows plus a second loader unless preserving previous context is explicitly required.

If the screen has a fixed pagination footer:

- keep the footer visible;
- disable pagination buttons while loading/refetching;
- render the loading state inside the scrollable rows area;
- do not duplicate loading text in the footer.

---

## 7. Empty states and disabled future controls

Loading and empty states are different.

- Loading: skeleton or spinner depending on content type.
- Empty: user-facing explanation and next action when applicable.
- Disabled future control: visible only if useful for discoverability, clearly disabled and labelled as not yet available.

Unimplemented controls must not look functional.

---

## 8. Actions and menus

Use shared primitives:

- `Button` for actions;
- `ButtonGroup` for grouped toolbar actions;
- `DropdownMenu` for row-level action menus;
- `Dialog` for modal forms/confirmations;
- `Select` for controlled selections.

Row action density rule:

- if a row has multiple secondary actions, prefer a single icon button that opens `DropdownMenu`;
- destructive actions inside menus must use the destructive menu item variant;
- do not keep a separate bordered action group when one menu button is enough.

---

## 9. `/directories/works` current UI contract

The `/directories/works` screen is the current reference implementation for compact production catalog UI.

Current merged state as of 2026-05-15:

- debug borders were converted to semantic system borders;
- unnecessary visual wrappers were removed;
- row spacing was normalized to `mx-3 my-1.5` so neighboring rows have consistent 6px vertical rhythm;
- row actions were collapsed into a single gear button with `DropdownMenu`;
- row typography was aligned across `Код`, `Название`, `Ед. изм / Расценка`, `Категория`;
- list scrolling is limited to the rows area;
- pagination remains visible at the bottom of the list card;
- loading states for the works list use skeleton rows, including initial load, search, pagination and Suspense fallback;
- the works screen no longer uses spinner for list loading.

Required works list behavior:

```txt
Toolbar stays above the list.
Rows area scrolls.
Pagination footer remains visible.
Loading rows are skeleton rows inside the rows area.
Buttons are disabled during loading/refetching.
Empty state appears only when loading is complete and no rows exist.
```

Required primitives:

| Area | Primitive |
|---|---|
| Search field | `Input` |
| Toolbar actions | `Button`, `ButtonGroup` |
| Category filters | `Select`, `Button` |
| Row values | `Badge` |
| Row actions | `Button`, `DropdownMenu` |
| Dialogs | `Dialog`, `Input`, `Button`, `Table` where needed |
| List loading | `Skeleton` |

Do not add local UI primitives to `/directories/works`.

---

## 10. Icons

Use Phosphor icons only.

Correct:

```tsx
import { GearSixIcon } from "@phosphor-icons/react"
```

Incorrect:

```tsx
import { HomeIcon } from "@heroicons/react"
import { FiHome } from "react-icons/fi"
```

---

## 11. Checklist before merging UI changes

Before merging a UI PR, verify:

- primitives are imported from `components/ui`;
- no local button/input/select/dropdown/dialog/skeleton/spinner was introduced;
- colors use semantic tokens;
- text uses current compact typography conventions;
- loading state matches content type;
- empty state is not shown while loading;
- pagination/action buttons are disabled during loading;
- no debug-only borders, fills or wrappers remain;
- light and dark themes are supported by tokens;
- PR scope does not mix unrelated architecture changes with local visual cleanup.
