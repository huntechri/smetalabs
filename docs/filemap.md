# File map

> This document is a compact source map for the Smetalabs repository. Keep it updated when adding new feature slices or moving files.

## Top-level folders

```txt
app/                      # Next.js routes, API routes and route groups
components/               # shared non-feature UI infrastructure
components/ui/            # approved UI primitives
features/                 # product feature modules
lib/                      # shared infrastructure and utilities
db/                       # database schema, migrations and seed data
docs/                     # source documentation
types/                    # shared domain types
```

## Feature folder convention

```txt
features/<feature>/
├── api/
├── components/
├── hooks/
├── lib/
├── server/
├── __mocks__/
├── types.ts
└── <subdomain>/components/
```

---

## `db/`

```txt
db/
├── index.ts                # Supabase service-role client wrapper for checked server code
├── seed.ts
├── seed-settings.ts
├── migrations/
│   ├── 002_rls_policies.sql
│   ├── 003_workspace_tables.sql
│   ├── 004_auth_invitation_flow.sql
│   ├── 005_rls_advisor_cleanup.sql
│   ├── 006_defer_invite_acceptance.sql
│   ├── 007_advisor_policy_grants.sql
│   ├── 008_private_rls_helpers.sql
│   ├── 009_transfer_workspace_ownership.sql
│   ├── 010_directory_works_foundation.sql
│   ├── 011_directory_works_read_api.sql
│   ├── 012_directory_works_ai_search.sql
│   ├── 013_directory_works_performance_hardening.sql
│   ├── 014_private_service_role_grants.sql
│   ├── 015_directory_work_update_rpc.sql
│   ├── 016_directory_works_large_catalog_read.sql
│   ├── 017_directory_materials_import.sql
│   ├── 018_directory_materials_ai_search.sql
│   ├── 017_fix_directory_works_search_ambiguous_id.sql
│   ├── 018_directory_works_staged_search.sql
│   ├── 019_directory_materials_foundation.sql
│   ├── 019_directory_works_manual_order.sql
│   ├── 020_large_directory_import_batches.sql
│   ├── 021_material_search_terms.sql
│   ├── 023_material_embedding_backfill.sql
│   ├── 024_directory_counterparties_foundation.sql
│   ├── 025_directory_counterparties_function_grants.sql
│   ├── 026_projects_foundation.sql
│   ├── 027_projects_function_grants.sql
│   ├── 028_projects_customer_counterparty.sql
│   ├── 029_global_purchases_foundation.sql
│   ├── 030_global_purchases_project_sort_index.sql
│   ├── 031_global_purchases_link_indexes.sql
│   ├── 032_directory_suppliers_foundation.sql
│   └── 033_project_estimate_records_foundation.sql
└── schema/
    ├── index.ts
    ├── projects.ts
    ├── project-estimate-records.ts
    ├── global-purchases.ts
    ├── directory-counterparties.ts
    ├── directory-suppliers.ts
    ├── directory-materials.ts
    ├── directory-works.ts
    ├── profiles.ts
    ├── rbac.ts
    ├── user-settings.ts
    ├── workspace-allowed-domains.ts
    ├── workspace-invitations.ts
    └── workspace-members.ts
```

---

## Current critical flows

### Projects and project estimate records

```txt
/projects
  → app/api/projects/** exposes workspace-scoped list/read/create/update/archive routes
  → app/api/projects/[id]/estimate-records/** exposes project-scoped estimate-record list/create/update/delete routes
  → features/projects/** owns UI hooks, source-aligned form/toolbar/cards, project overview, repository and service logic
  → docs/projects-architecture.md fixes the current contract
  → db/schema/projects.ts and db/migrations/026-028_projects_*.sql provide project storage, helper grants and customer link
  → db/schema/project-estimate-records.ts and db/migrations/033_project_estimate_records_foundation.sql provide estimate-record storage
```

Projects stay workspace-scoped through `workspace_owner_id`. The project list supports real list data, search, status filtering, create, update and soft archive. Customer selection is linked to active counterparties of type `customer`. Budget and progress are system-managed placeholders in this slice: they are displayed but not entered manually.

The project estimate-record layer stores only rows shown in the project estimate table: name, type, status, amount and creation date. It supports list, create by name, rename and soft delete. It does not include estimate contents, works, materials, calculations, documents, purchases, execution, import, export or AI behavior.

### Global purchases first production slice

```txt
/procurements
  → app/api/global-purchases/** exposes workspace-scoped list/read/create/update/archive routes
  → app/api/global-purchases/material-options exposes lightweight material picker search
  → features/global-purchases/** owns UI hooks, material picker, toolbar, grouped list, repository and service logic
  → docs/global-purchases-architecture.md fixes the first-version contract
  → db/schema/global-purchases.ts and db/migrations/029-031_global_purchases_*.sql provide storage, ordering and link indexes
```

Global purchases stay workspace-scoped through `workspace_owner_id`. The first version opens on today's date by default, supports real list data, text search, project filtering, date filtering, grouped rows by object, material-based create, material replacement, fact quantity/price edits, row date/object edits and soft archive. Project selection is linked to active non-archived projects. Material adding uses the materials catalog as source but queries only a lightweight material-picker endpoint. Supplier selection, import, export, AI behavior, warehouse logic, payments and manual plan editing remain outside this slice.
