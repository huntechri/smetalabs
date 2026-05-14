# Directory works RPC mutation pattern

> Last updated: 2026-05-14
>
> Scope: mutation performance pattern for `/directories/works` and future directory-style components.

## Why this exists

The `/directories/works` update path originally executed several sequential Supabase/PostgREST calls from the Next.js API layer:

```txt
auth/workspace/role checks
→ read current work
→ uniqueness checks
→ update directory_works
→ read updated work
→ update stale embedding rows
→ upsert pending embedding row
→ cache invalidation
```

After moving Vercel Functions to `fra1` and keeping Supabase in `eu-west-1`, the main remaining latency source was no longer database CPU time. It was the number of backend-to-Supabase round trips and the PostgREST overhead per request.

Migration `015_directory_work_update_rpc.sql` introduces `public.update_directory_work_with_embedding(...)` to collapse the hot update path into one service-role-only RPC call.

## Current update contract

The HTTP/API boundary remains unchanged:

```txt
PATCH /api/directory-works/:id
```

The browser still calls the Next.js route only. Browser clients must not call mutation RPCs directly.

The server-side flow is now:

```txt
PATCH route
→ Zod validation
→ require authenticated user
→ require current workspace
→ require write role: owner/admin/manager
→ repository calls public.update_directory_work_with_embedding(...)
→ revalidate directory works cache tags
```

The RPC owns the database-local mutation work:

```txt
check row exists in workspace
check code uniqueness
check source_name + source_external_row_key uniqueness
normalize title/unit/category fields
update directory_works
return the updated UI projection
mark old embedding rows stale
upsert the new pending embedding row
```

This keeps authorization in application code and moves database-local consistency work into Postgres.

## Security rules

Mutation RPCs must follow these rules:

```txt
SECURITY DEFINER
SET search_path = ''
REVOKE EXECUTE FROM PUBLIC, anon, authenticated
GRANT EXECUTE TO service_role
```

The repository may call the RPC only after explicit application-level authorization. RLS remains the fallback guard for direct table access, but service-role RPCs must never become browser-callable.

Do not expose `workspace_owner_id` as client authority. The API layer must resolve it server-side through the current workspace context.

## Performance rules for future components

For mutation hot paths, prefer one RPC when all of these are true:

```txt
1. The mutation needs multiple related DB reads/writes.
2. The reads/writes must happen sequentially for correctness.
3. The operation is called from interactive UI, such as save/edit/archive.
4. The operation can return a stable projection to the API layer.
5. Authorization can be checked before the RPC call.
```

Avoid implementing hot mutations as many sequential Supabase/PostgREST calls from server code when those calls are only coordinating database-local work.

Good candidates:

```txt
update canonical directory row + uniqueness checks + search fields + queue markers
archive row + version bump + dependent queue/cache marker
bulk apply import rows in chunks
status transitions with summary counters
```

Poor candidates:

```txt
single simple read
pure UI projection mapping
third-party API calls
logic that requires user/session objects inside SQL
operations where browser clients need direct access
```

## Embedding queue rule

CRUD routes must not synchronously call the embedding provider. They should only enqueue or mark embedding work:

```txt
pending
stale
failed
ready
```

Provider calls remain in the bounded embedding processor route:

```txt
POST /api/directory-works/embeddings/process
```

For update, the RPC now creates or updates the pending embedding queue row directly, so the service layer must not enqueue the same work a second time after the RPC returns.

## Error mapping

Database-specific mutation errors should be mapped in the repository/service layer into user-facing API errors.

Current mappings:

```txt
DIRECTORY_WORK_CODE_DUPLICATE   → 400 Работа с таким кодом уже существует
DIRECTORY_WORK_SOURCE_DUPLICATE → 400 Работа с таким внешним идентификатором уже существует
empty/invalid input             → validation should normally be caught by Zod before RPC
```

The API response contract should stay stable even if the database implementation changes.

## Validation performed

Applied migration:

```txt
015_directory_work_update_rpc
```

Smoke-test on Supabase project `Smetalabs` confirmed:

```txt
RPC updates an existing work
version increments
updated projection is returned
embedding rows are maintained
```

DB-local micro-benchmark over 5 sequential RPC calls:

```txt
min: 1.736ms
avg: 10.396ms
max: 35.531ms
rows returned: 5
```

This measures execution inside Postgres, not full end-user latency. End-user latency also includes Vercel Function runtime, auth/workspace checks, Supabase HTTP/PostgREST overhead and cache invalidation.

## Development checklist

When adding similar RPC-backed mutations:

```txt
1. Keep the public HTTP route stable.
2. Keep Zod validation at the API/server boundary.
3. Resolve workspace/user server-side.
4. Check role permissions before calling the RPC.
5. Restrict RPC execute grants to service_role.
6. Return the same projection expected by frontend mappers.
7. Keep provider/network calls outside SQL.
8. Add a migration smoke-test note to the PR.
9. Update this document if the mutation pattern changes.
```
