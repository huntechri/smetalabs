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

## `types/`

```txt
types/
├── directory-counterparty.ts
├── directory-supplier.ts
├── directory-work.ts
├── estimate.ts
├── execution.ts
├── global-purchases.ts
├── project.ts
├── project-estimate-content.ts    # Sections, works, materials for estimate content storage
├── project-estimate-record.ts     # Estimate record row types (name, type, status, amount)
├── purchase.ts
└── roles.ts
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
│   ├── 033_project_estimate_records_foundation.sql
│   └── 034_project_estimate_content_foundation.sql
└── schema/
    ├── index.ts
    ├── projects.ts
    ├── project-estimate-records.ts
    ├── project-estimate-content.ts
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

## `app/api/projects/`

```txt
app/api/projects/
├── route.ts                                    # GET (list), POST (create)
├── [id]/
│   ├── route.ts                                # GET (read), PATCH (update), DELETE (archive)
│   └── estimate-records/
│       ├── route.ts                            # GET (list), POST (create)
│       └── [recordId]/
│           ├── route.ts                        # PATCH (rename), DELETE (soft delete)
│           ├── changes/route.ts                # GET — estimate content changes log (stub)
│           ├── content/route.ts                # GET — read sections/works/materials
│           ├── material-options/route.ts        # GET — lightweight material picker for estimate
│           └── work-options/route.ts            # GET — lightweight work picker for estimate
```

---

## `features/projects/`

```txt
features/projects/
├── api/
│   ├── projects-client.ts                    # Client-side API calls for projects CRUD
│   ├── projects-errors.ts                    # Error classes for project operations
│   ├── projects-query-keys.ts                # TanStack Query key factory
│   └── project-estimate-records-client.ts    # Client-side API calls for estimate records CRUD
├── components/
│   ├── create-project-dialog.tsx             # Dialog for creating a new project
│   ├── project-card.tsx                      # Card component for project list item
│   ├── projects-toolbar.tsx                  # Toolbar: search, status filter, create button
│   └── projects-view.tsx                     # Main projects page layout
├── hooks/
│   ├── use-projects.ts                       # TanStack Query hook for projects list
│   └── use-project-estimate-records.ts       # TanStack Query hook for estimate records
├── project-overview/
│   ├── components/
│   │   ├── chart-area-interactive.tsx        # Interactive chart for project overview
│   │   ├── estimate-delete-dialog.tsx        # Confirm dialog for soft-deleting an estimate record
│   │   ├── estimate-name-dialog.tsx          # Dialog for creating/renaming an estimate record
│   │   ├── estimates-table.tsx               # Table of estimate records for a project
│   │   └── section-cards.tsx                 # Cards displaying estimate content sections
│   ├── lib/
│   │   └── estimate-table-data.ts            # Data transformation for estimates table
│   └── types.ts                              # Project overview specific types
└── server/
    ├── projects.repository.ts                # DB queries for projects (Drizzle)
    ├── projects.route-handlers.ts            # Next.js route handler implementations
    ├── projects.schemas.ts                   # Zod validation schemas for projects
    ├── projects.service.ts                   # Business logic for projects
    ├── project-estimate-records.repository.ts  # DB queries for estimate records (Drizzle)
    ├── project-estimate-records.route-handlers.ts # Route handler implementations for estimate records
    ├── project-estimate-records.schemas.ts    # Zod validation schemas for estimate records
    ├── project-estimate-records.service.ts    # Business logic for estimate records
    ├── project-estimate-content.repository.ts  # DB queries for estimate content (sections/works/materials)
    ├── project-estimate-content.route-handlers.ts # Route handler implementations for estimate content
    ├── project-estimate-content.schemas.ts    # Zod validation schemas for estimate content
    └── project-estimate-content.service.ts    # Business logic for estimate content
```

---

## Current critical flows

### Projects and project estimate records

```txt
/projects
  → app/api/projects/** exposes workspace-scoped list/read/create/update/archive routes
  → app/api/projects/[id]/estimate-records/** exposes project-scoped estimate-record list/create/update/delete routes
  → app/api/projects/[id]/estimate-records/[recordId]/content exposes estimate content (sections/works/materials)
  → app/api/projects/[id]/estimate-records/[recordId]/material-options exposes lightweight material picker
  → app/api/projects/[id]/estimate-records/[recordId]/work-options exposes lightweight work picker
  → app/api/projects/[id]/estimate-records/[recordId]/changes exposes content changes log (stub)
  → features/projects/** owns UI hooks, source-aligned form/toolbar/cards, project overview, repository and service logic
  → docs/projects-architecture.md fixes the current contract
  → docs/project-estimate-content-architecture.md fixes the estimate content storage contract
  → db/schema/projects.ts and db/migrations/026-028_projects_*.sql provide project storage, helper grants and customer link
  → db/schema/project-estimate-records.ts and db/migrations/033_project_estimate_records_foundation.sql provide estimate-record storage
  → db/schema/project-estimate-content.ts and db/migrations/034_project_estimate_content_foundation.sql provide estimate section/work/material storage
```

Projects stay workspace-scoped through `workspace_owner_id`. The project list supports real list data, search, status filtering, create, update and soft archive. Customer selection is linked to active counterparties of type `customer`. Budget and progress are system-managed placeholders in this slice: they are displayed but not entered manually.

The project estimate-record layer stores rows shown in the project estimate table: name, type, status, amount and creation date. It supports list, create by name, rename and soft delete. The estimate-content storage layer extends each record with sections, works and materials. It stores copied work/material values, row order and totals. Content reading is exposed via `GET /content`, while editing UI, documents, purchases, execution, import, export and AI behavior remain outside this slice.

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
