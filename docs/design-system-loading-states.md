# SmetaLabs — Loading states design contract

> Status: active UI contract.
>
> Scope: loading, refreshing and pending states for production screens that use shadcn/ui, Tailwind v4 and the project design tokens.

This document extends `docs/design-system.md` with explicit rules for loading states. It exists so feature work does not drift between local spinners, ad-hoc overlays and inconsistent skeleton layouts.

---

## 1. Core rule

Use loading indicators that preserve the shape of the interface.

For structured content, prefer skeletons that match the final layout. Do not show an unrelated spinner when the user can benefit from seeing the future structure of the content.

```txt
Structured list / table / cards → Skeleton
Small inline action              → Button text or compact inline pending state
Global blocking state            → Avoid unless navigation/auth requires it
```

---

## 2. Skeleton usage

Use `Skeleton` only from `@/components/ui/skeleton`.

Do not create local skeleton primitives in a feature folder. Feature-specific skeleton compositions are allowed when they mirror a feature-specific layout, but every placeholder block must still use the shared `Skeleton` primitive.

Recommended cases:

- first load of a list, table or card collection;
- search result refresh when the list content is expected to change;
- pagination result refresh;
- Suspense fallback for structured screens;
- detail panels where the final field structure is known.

Rules:

- skeleton should mirror the final visual structure;
- keep the same outer spacing, borders and grid rhythm as the final content;
- use semantic system surfaces only: `bg-card`, `bg-muted`, `border-border`, `text-muted-foreground`;
- do not use hardcoded colors;
- do not add business text inside skeleton rows;
- add `aria-busy="true"` on the skeleton container when it represents an active loading region;
- keep skeleton components local to the feature only when their shape is feature-specific.

Example:

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

---

## 3. Spinner usage

Use `Spinner` only from `@/components/ui/spinner`.

Spinner is allowed, but it should be a narrow fallback rather than the default list-loading pattern.

Allowed cases:

- small inline pending state where no final content shape exists;
- button-level action feedback when the button label alone is not enough;
- compact blocking action inside a dialog;
- external integration or background operation where the resulting layout is unknown.

Avoid spinner for:

- lists;
- tables;
- card grids;
- structured detail pages;
- page-level loading where the final layout is known.

Do not create local SVG spinners or local `animate-spin` loaders in feature code.

---

## 4. Refreshing existing content

For structured result refreshes, such as search and pagination, prefer one of these two patterns:

1. Replace the rows with skeleton rows when the content identity changes.
2. Keep old rows and add a subtle non-blocking pending hint only when preserving old context is more important than showing incoming shape.

Current preferred pattern for compact catalogs is skeleton replacement, because it avoids mixing stale rows with incoming data and keeps the UI visually stable.

Do not add a second loading indicator in the footer if the list body already shows a loading state.

---

## 5. Pagination and sticky footers

When a list has a fixed footer or pagination row:

- keep pagination visible during loading;
- disable pagination buttons while loading/refetching;
- show the loading state inside the scrollable rows area, not inside the pagination footer;
- do not let the loading state create a second page-level scroll.

---

## 6. Accessibility

- Use `aria-busy="true"` on the loading region.
- Use a concise `aria-label` when the skeleton region has no visible loading text.
- Do not announce every skeleton row separately.
- For destructive or mutating actions, disabled button state is still required even if the surrounding list shows a loader.

---

## 7. Implementation checklist

Before merging a new loading state:

- shared primitive is imported from `components/ui`;
- no feature-local primitive was created;
- skeleton/spinner matches the content type;
- semantic tokens are used for color and borders;
- light and dark themes are supported by tokens;
- no duplicate loader appears in footer, toolbar or Suspense fallback;
- pagination/action buttons are disabled while data is loading;
- empty state is separate from loading state.
