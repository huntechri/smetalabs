# Directory works search system

> Last updated: 2026-05-14
>
> Scope: user-facing and backend search behavior for `/directories/works`.
>
> Related files:
>
> - `features/directories/components/directories-toolbar.tsx`
> - `features/directory-works/hooks/use-directory-works.ts`
> - `features/directory-works/server/directory-works.search.ts`
> - `features/directory-works/server/directory-works.repository.ts`
> - `features/directory-works/api/directory-works-mappers.ts`
> - `db/migrations/016_directory_works_large_catalog_read.sql`
> - `db/migrations/017_fix_directory_works_search_ambiguous_id.sql`
> - `db/migrations/018_directory_works_staged_search.sql`

---

## 1. Main rule

Search scope and UI paging are separate concerns.

```txt
Search scope: all active rows in the current workspace.
UI output: one page of matching rows.
```

This means the search must not be limited to the rows currently visible in the browser. If a workspace has 35,000 works and the UI currently displays 50, a new query must search all 35,000 workspace rows first and only then return the first page of matching results.

Incorrect behavior:

```txt
User sees rows 1-50.
User searches.
System searches only rows 1-50.
```

Correct behavior:

```txt
Workspace has 35,000 rows.
User searches.
System searches all matching workspace rows.
System returns rows 1-50 from the result set.
Next page returns rows 51-100 from the same result set.
```

---

## 2. Tenant boundary

Every search is scoped by the current workspace owner id.

```txt
workspace_owner_id = current workspace owner id
status = active by default
deleted_at is null
```

The client never decides `workspace_owner_id`. API routes resolve the current workspace server-side and pass it into the repository/RPC layer.

Search across all rows means all rows inside the current workspace only. It never means global cross-tenant search.

---

## 3. User-facing behavior

### 3.1 Opening the page

When the user opens `/directories/works` without `q`, the system shows the first page of the current workspace catalog.

```txt
/directories/works
```

Expected behavior:

```txt
- no relevance search;
- no alias/keyword aggregation;
- no exact total count over the full catalog;
- return `limit + 1` rows to detect whether the next page exists.
```

The UI displays only the visible page. This is intentional. A large catalog must not render thousands of DOM rows.

### 3.2 Submitting a new search

When the user submits a new search from the toolbar, the UI removes the previous `cursor` query parameter.

Example:

```txt
Before: /directories/works?cursor=500
User searches: монтаж
After: /directories/works?q=монтаж
```

Reason: a new query must start from the first page of matching results. Keeping an old cursor would skip the first matching results and make the user think search is broken.

### 3.3 Moving through results

When the user clicks `Вперёд`, the UI keeps the same filters/query and changes only `cursor`.

Example:

```txt
/directories/works?q=монтаж
/directories/works?q=монтаж&cursor=50
/directories/works?q=монтаж&cursor=100
```

Each page is a page of the search result set, not a page of the unfiltered catalog.

### 3.4 Clearing search

When the user clears the search box and submits, `q` is removed and `cursor` is reset.

Example:

```txt
Before: /directories/works?q=монтаж&cursor=100
After: /directories/works
```

---

## 4. Query parameters

The regular list/search endpoint accepts:

```txt
q
category
subcategory
unit
status
limit
cursor
sort
```

Defaults:

```txt
status = active
limit = 50
cursor = 0
sort = relevance
```

Bounds:

```txt
limit: 1..100
interactive cursor: capped at 5000 in application parsing
```

Deep extraction is not an interactive UI responsibility. Large exports must use the bounded export flow.

---

## 5. Search modes

The backend uses staged search modes. It does not run the heaviest matching strategy first.

Order:

```txt
1. Browse mode: no q.
2. Exact code/source-key mode.
3. Fast text mode.
4. Similar-text fallback mode.
```

---

## 6. Browse mode

Triggered when `q` is empty.

Purpose: display a page from the catalog or filtered catalog.

Search area:

```txt
all active rows in current workspace matching category/subcategory/unit filters
```

Work performed:

```txt
- filter by workspace/status/deleted_at;
- apply category/subcategory/unit filters;
- sort by updated_desc or title_asc;
- return limit + 1 rows;
- do not calculate exact total count;
- do not aggregate aliases/keywords.
```

Why no exact total count: counting a large catalog on every page open is unnecessary and can become expensive. The UI only needs to know whether another page exists.

---

## 7. Exact code/source-key mode

Triggered when `q` exactly matches a work code or external row key.

Examples:

```txt
LT90-034201
FER-12-01-001
issue-90-034201
```

Search area:

```txt
all active rows in current workspace matching current filters
```

Matching fields:

```txt
lower(code)
lower(source_external_row_key)
```

Behavior:

```txt
- exact match is checked before ordinary text search;
- fuzzy/similar search is not used when exact matches exist;
- result is paged after all exact matches are found;
- aliases/keywords are loaded only for returned exact rows.
```

This mode is expected to be the fastest search path after simple browse.

---

## 8. Fast text mode

Triggered when `q` is not empty and no exact code/source-key match was found.

Purpose: cover normal user searches without immediately using expensive similar-text matching.

Examples:

```txt
монтаж
штукатурка
Load test work 34
демонтаж плитки
```

Search area:

```txt
all active rows in current workspace matching current filters
```

Fast matching sources:

```txt
normalized_title exact match
normalized_title prefix match
code prefix match
source_external_row_key prefix match
full-text search over search_fts
alias exact/prefix match
keyword exact/prefix match
```

Important behavior:

```txt
- category/subcategory/unit filters are applied before matching;
- search is not limited to visible UI rows;
- pagination is applied only after the matching result set is built;
- returned rows include total_count for the matched result set;
- returned rows are ordered by search_rank, then recency/title/id tie-breakers.
```

---

## 9. Similar-text fallback mode

Similar-text matching is a fallback, not the default.

It is used only when fast text mode finds no matches.

Purpose: tolerate typos or imperfect phrasing.

Examples:

```txt
штукотурка
мантаж
gipsokarton montazh
```

Fallback fields:

```txt
normalized_title
search_text
normalized_alias
normalized_keyword
```

Why fallback only: similar-text checks are more expensive than exact, prefix and full-text checks. Running them on every ordinary query makes large catalogs slower.

Expected behavior:

```txt
- first try exact/prefix/full-text search;
- if fast matches exist, do not run similar-text matching;
- if no fast matches exist, run similar-text matching and return a paged result set.
```

---

## 10. Filters

Filters are part of the search scope, not a UI-only post-filter.

Supported filters:

```txt
category
subcategory
unit
status
```

Correct order:

```txt
1. Resolve workspace.
2. Apply status/deleted filters.
3. Apply category/subcategory/unit filters.
4. Search inside that filtered set.
5. Sort results.
6. Return the requested page.
```

Incorrect order:

```txt
1. Search broad catalog.
2. Limit candidates.
3. Apply category filter after candidate limit.
```

The incorrect order can hide valid results because unrelated rows can consume the candidate limit before the selected category is applied.

---

## 11. Pagination contract

The API uses offset-style cursor for the interactive list contract.

```txt
cursor = number of matching rows to skip
limit = number of visible rows requested
```

The RPC returns:

```txt
limit + 1 rows
```

The application maps this to:

```txt
visibleRows = first limit rows
hasMore = rows.length > limit
nextCursor = hasMore ? cursor + limit : null
```

The extra row is a sentinel. It is not rendered as a visible row.

### 11.1 Browse total

Browse mode intentionally skips exact total count.

For browse mode, `total_count` is null. The API reports a lower-bound total:

```txt
cursor + visibleRows.length + (hasMore ? 1 : 0)
```

UI label should treat this as an approximate/lower-bound number, for example:

```txt
Всего: минимум 101
```

### 11.2 Search total

Search modes can return exact `total_count` for the matched result set because they already build a finite result set for the query.

Example:

```txt
q = Load test work 34
matched_total = 1111
first page = 20 visible rows + 1 sentinel
```

---

## 12. Sorting

Browse mode supports:

```txt
updated_desc
title_asc
relevance (treated like updated_desc when q is empty)
```

Search mode primarily sorts by relevance:

```txt
1. higher search_rank;
2. newer updated_at;
3. normalized_title;
4. id.
```

Exact code/source-key matches receive the highest rank.

---

## 13. UI responsibilities

The UI must:

```txt
- submit search through URL query parameters;
- reset cursor when q changes;
- preserve q/filter parameters when moving next/previous;
- show only the current page of rows;
- render next/previous controls from meta.hasMore/meta.nextCursor;
- not assume that visible rows are the full search scope;
- not try to load the entire catalog into the browser.
```

The UI must not:

```txt
- search only within rendered rows;
- filter only the current page client-side;
- keep an old cursor after a new q value is submitted;
- render thousands of rows at once.
```

---

## 14. Backend responsibilities

The backend must:

```txt
- resolve workspace server-side;
- search only inside the current workspace;
- apply filters before matching;
- search the full filtered result set, not the visible page;
- page the final result set;
- avoid expensive fallback matching unless fast matching found nothing;
- keep exact code/source-key search fast;
- return mapper-compatible row shapes.
```

The backend must not:

```txt
- trust workspace_owner_id from the browser;
- apply candidate limits before category/unit filters;
- run similar-text matching as the first/default path;
- calculate full catalog counts on every browse request;
- load aliases/keywords for every catalog row during ordinary browse.
```

---

## 15. Search examples

### 15.1 Open first page

```txt
GET /api/directory-works
```

Expected:

```txt
- first page of active works;
- no q;
- no exact total;
- hasMore based on sentinel row.
```

### 15.2 Search exact code

```txt
GET /api/directory-works?q=LT90-034201
```

Expected:

```txt
- searches all active workspace rows;
- returns the matching code even if it is not on the currently visible UI page;
- no heavy similar-text fallback.
```

### 15.3 Search normal text

```txt
GET /api/directory-works?q=Load%20test%20work%2034
```

Expected:

```txt
- searches all active workspace rows;
- finds all matching rows;
- returns first page;
- next cursor returns the next page of the same result set.
```

Observed staging example with 35k load-test rows:

```txt
q = Load test work 34
matched_total = 1111
first page = 21 rows returned by RPC = 20 visible + 1 sentinel
second page cursor=20 = next 20 visible + 1 sentinel
```

### 15.4 Search with category

```txt
GET /api/directory-works?q=монтаж&category=Отделка
```

Expected:

```txt
- first narrow to current workspace + active + category=Отделка;
- then search inside that category;
- return first page of matching category results.
```

---

## 16. Current limitations

Current interactive pagination still uses numeric offset-style cursor.

This is acceptable for the current UI because:

```txt
- interactive cursor is capped;
- export is bounded separately;
- huge deep browsing should become a dedicated background/staged workflow if needed.
```

Future improvements:

```txt
- keyset pagination for browse mode;
- dedicated search index/materialized table if fuzzy search grows;
- user-visible search mode labels, for example exact / text / typo fallback;
- debounce search submission for live search;
- minimum query length for automatic live search;
- stronger trigram indexes if typo fallback becomes a common path.
```

---

## 17. Validation checklist

Use a workspace with a large enough dataset, for example 35k+ rows.

Required checks:

```txt
1. Open /directories/works.
   Expected: first page loads, next button available when hasMore=true.

2. Go to a later page.
   Expected: URL contains cursor.

3. Submit a new search.
   Expected: cursor disappears from URL.

4. Search for a known code not visible on the first page.
   Expected: the row is found.

5. Search for common text.
   Expected: first page of all matching rows is returned.

6. Click next on search results.
   Expected: second page of the same search result set is returned.

7. Search with category filter.
   Expected: search is scoped to that category across the full workspace.

8. Clear search.
   Expected: q and cursor are removed; ordinary browse resumes.
```

Staging SQL smoke checks:

```sql
select count(*)::integer as exact_code_hits
from public.search_directory_works(
  '<workspace-owner-id>'::uuid,
  'LT90-034201',
  null,
  null,
  null,
  'active'::public.directory_work_status,
  20,
  0,
  'relevance'
);
```

```sql
select
  count(*)::integer as first_page_rows,
  max(total_count)::integer as matched_total
from public.search_directory_works(
  '<workspace-owner-id>'::uuid,
  'Load test work 34',
  null,
  null,
  null,
  'active'::public.directory_work_status,
  20,
  0,
  'relevance'
);
```

```sql
select
  count(*)::integer as second_page_rows,
  max(total_count)::integer as matched_total
from public.search_directory_works(
  '<workspace-owner-id>'::uuid,
  'Load test work 34',
  null,
  null,
  null,
  'active'::public.directory_work_status,
  20,
  20,
  'relevance'
);
```

The first and second search page should report the same `matched_total` and different visible rows.

---

## 18. Non-goals

This search system is not intended to:

```txt
- search across all tenants;
- load the full catalog into the browser;
- make semantic/vector search the default path;
- replace import/export staging;
- support unbounded deep interactive pagination;
- calculate exact full-catalog totals on every browse request.
```

Semantic/vector search remains a separate AI/hybrid feature and should not be required for normal catalog lookup.
