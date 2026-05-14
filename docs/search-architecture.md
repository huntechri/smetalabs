# Search architecture

> Last updated: 2026-05-14
>
> Scope: shared search behavior for large workspace-scoped lists and catalogs.
>
> This document is the reusable search contract for new product areas. Feature-specific documents may add details, but they must not contradict the rules here.

---

## 1. Core rule

Search and UI pagination are separate.

```txt
Search scope: all matching rows in the current workspace.
UI output: one page of those matching rows.
```

A user-visible page must never define the search scope.

Incorrect behavior:

```txt
User sees 50 rows.
User searches.
System searches only those 50 rendered rows.
```

Correct behavior:

```txt
Workspace has 35,000 rows.
User searches.
System searches all eligible rows in the workspace.
System returns the first page of the matching result set.
Next page returns the next page of the same matching result set.
```

This rule applies to all large workspace lists: directories, catalogs, estimates, templates, clients, materials or future inventory-like modules.

---

## 2. Tenant boundary

Every search must be scoped server-side.

```txt
current workspace
allowed status/deleted state
current user permissions
```

The browser must not be trusted to provide tenant authority.

Feature APIs may accept filters such as `category`, `status`, `type`, `unit` or `date`, but must not accept `workspace_owner_id` or equivalent tenant id as a trusted user-controlled value.

---

## 3. Standard request model

A searchable list should use a consistent request shape where possible:

```txt
q          optional search text
filters    optional structured filters
sort       optional sort mode
limit      visible rows requested
cursor     page offset/token
```

For URL-driven pages, the same state should be represented in query parameters.

Example:

```txt
/items?q=монтаж&category=Отделка&cursor=50
```

---

## 4. Cursor reset rule

A new search or changed filter must reset pagination.

Incorrect:

```txt
/items?cursor=500
User enters q=монтаж
/items?q=монтаж&cursor=500
```

Correct:

```txt
/items?cursor=500
User enters q=монтаж
/items?q=монтаж
```

Reason: an old cursor belongs to the previous result set. Keeping it can skip the first matches and make the search look broken.

Pagination controls may change `cursor`, but search inputs and filters must remove it.

---

## 5. Result paging rule

Search must build the matching result set first and page it second.

Correct order:

```txt
1. Resolve workspace and permissions.
2. Apply status/deleted constraints.
3. Apply structured filters.
4. Match/search inside the filtered set.
5. Sort results.
6. Return the requested page.
```

Incorrect order:

```txt
1. Take the current UI page.
2. Search inside that page.
```

Also incorrect:

```txt
1. Search broad data.
2. Apply arbitrary candidate limit.
3. Apply category/status filters after the limit.
```

Filtering after an early broad limit can hide valid results.

---

## 6. Standard search stages

Large catalogs should use staged search.

Default order:

```txt
1. Browse/list mode: no q.
2. Exact identifier match.
3. Fast text match.
4. Similar/typo fallback.
5. AI/semantic mode only when explicitly requested.
```

The heaviest mode must not run first.

---

## 7. Browse/list mode

Triggered when `q` is empty.

Purpose: show a page of the list or filtered list.

Expected behavior:

```txt
- no relevance scoring;
- no expensive full-catalog counting by default;
- no heavy relation aggregation for rows not shown;
- return only the current page plus a next-page sentinel when needed.
```

Browse mode must be optimized for opening the page quickly.

---

## 8. Exact identifier match

Triggered by known identifiers such as:

```txt
code
external id
article number
invoice number
template code
client code
```

Expected behavior:

```txt
- run before broad text search;
- search the full workspace result set, not the visible page;
- return exact matches first;
- do not run typo/semantic fallback when exact matches exist.
```

Exact identifier search should be the fastest search path after browse.

---

## 9. Fast text match

Fast text search is the default for normal user queries.

It may use:

```txt
title/name exact match
title/name prefix match
identifier prefix match
prepared search text
aliases/synonyms
keywords/tags
```

Expected behavior:

```txt
- search all eligible rows in the workspace;
- apply filters before matching;
- return a paged result set;
- keep ranking predictable;
- avoid expensive fallback work when fast matches exist.
```

---

## 10. Similar/typo fallback

Similar-text or typo-tolerant matching is a fallback, not the main path.

Use it when:

```txt
- exact identifier match found nothing;
- fast text search found nothing or too little;
- the query length is meaningful enough to avoid noisy results.
```

Do not use it on every keystroke or every ordinary query by default.

Reason: it is harder to predict and more expensive on large datasets.

---

## 11. AI/semantic search

AI/semantic search must be explicit.

It should not silently replace normal search.

Recommended UI:

```txt
Normal search: default input/search button.
AI search: separate button, tab or switch.
```

Reason:

```txt
- AI search is slower;
- AI search can cost money per request;
- AI search depends on prepared semantic data;
- AI search can return useful but less predictable matches.
```

Normal search should remain the default for operational workflows.

---

## 12. `limit + 1` sentinel pattern

Interactive list APIs should usually return one extra row.

Example:

```txt
limit = 50
backend fetches 51
UI renders 50
hasMore = fetchedRows.length > 50
```

The extra row is a sentinel. It must not be rendered as a visible item.

This avoids a separate count query just to know whether the next page exists.

---

## 13. Total count policy

Do not calculate exact totals by default for large browse pages.

Recommended policy:

```txt
Browse without q: no exact total, use hasMore/lower-bound display.
Search with q: exact matched total is allowed when the backend already builds the result set.
Reports/exports: use separate bounded or staged flows.
```

UI wording for non-exact totals should be honest:

```txt
минимум 101
есть ещё результаты
показано 1–50
```

Avoid showing a fake exact total.

---

## 14. Client-side responsibilities

A list UI must:

```txt
- keep search state in URL or explicit state container;
- reset cursor on new q/filter values;
- preserve q/filter values when paging;
- render only the current page;
- use API metadata for hasMore/nextCursor;
- show loading and error states;
- avoid client-side search over only rendered rows for server-owned datasets.
```

A list UI must not:

```txt
- treat visible rows as the full dataset;
- search only the current DOM rows;
- keep stale cursor after a new search;
- load the whole catalog into the browser to make search work;
- auto-enable AI search in the normal search box.
```

---

## 15. Backend responsibilities

A search backend must:

```txt
- resolve tenant/workspace server-side;
- verify user access before reading data;
- apply filters before matching;
- search the full filtered result set;
- page after matching and sorting;
- keep exact identifier search fast;
- keep fallback matching optional/staged;
- return stable metadata for pagination;
- avoid expensive joins/aggregations for rows not returned.
```

A search backend must not:

```txt
- trust tenant ids from the client;
- search only the visible page;
- apply filters after broad candidate limits;
- run the most expensive matcher first;
- calculate large exact totals on every browse request;
- mix AI search into the default path without explicit product decision.
```

---

## 16. Data quality for searchable catalogs

Search quality depends on data quality.

For simple operational search, a row usually needs:

```txt
identifier/code
name/title
category/type
status
```

For high-quality catalog search, prefer:

```txt
identifier/code
name/title
category/type
subcategory/subtype
description
aliases/synonyms
keywords/tags
structured attributes
```

For AI/semantic search, short rows are not enough. The system needs meaningful text describing what the row represents.

AI-ready catalog rows should include, where applicable:

```txt
description
included scope
excluded scope
aliases/synonyms
keywords/tags
object/material/process/context attributes
```

This is a data-quality requirement, not a reason to make AI search the default.

---

## 17. Validation checklist for new searchable components

Before merging a new searchable component, verify:

```txt
1. Opening the list loads only the first page.
2. Search finds rows outside the current visible page.
3. Search starts from the first result page after q changes.
4. Paging search results preserves q and filters.
5. Filters are applied before matching.
6. Exact code/id search works and is fast.
7. Similar/typo search is not the default first path.
8. AI search, if present, is explicit and separate.
9. Large browse does not calculate expensive exact totals by default.
10. The UI does not load the full dataset into the browser.
```

A component that fails item 2 is not a real server-side search.

---

## 18. Relation to feature-specific docs

Feature-specific docs may define exact fields and ranking rules.

Examples:

```txt
docs/directory-works-search-system.md
```

Those documents must follow this shared contract unless a product decision explicitly says otherwise.

If a feature needs different behavior, document the exception and the reason.
