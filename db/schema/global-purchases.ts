import { sql } from "drizzle-orm"
import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { profiles } from "./profiles"
import { projects } from "./projects"

export const globalPurchaseStatusEnum = pgEnum("global_purchase_status", [
  "planned",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
])

export const globalPurchases = pgTable(
  "global_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    unit: text("unit").notNull(),
    planQuantity: numeric("plan_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    planPrice: numeric("plan_price", { precision: 14, scale: 2 }).notNull(),
    factQuantity: numeric("fact_quantity", { precision: 14, scale: 3 }),
    factPrice: numeric("fact_price", { precision: 14, scale: 2 }),
    supplierId: uuid("supplier_id"),
    supplierName: text("supplier_name"),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    projectTitle: text("project_title"),
    purchaseDate: text("purchase_date"),
    status: globalPurchaseStatusEnum("status").notNull().default("planned"),
    notes: text("notes"),
    searchText: text("search_text").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("uq_global_purchases_id_workspace").on(
      t.id,
      t.workspaceOwnerId
    ),
    index("idx_global_purchases_workspace_status_deleted").on(
      t.workspaceOwnerId,
      t.status,
      t.archivedAt,
      t.deletedAt
    ),
    index("idx_global_purchases_workspace_project")
      .on(t.workspaceOwnerId, t.projectId)
      .where(sql`${t.projectId} IS NOT NULL AND ${t.deletedAt} IS NULL`),
    index("idx_global_purchases_workspace_project_sort")
      .on(
        t.workspaceOwnerId,
        t.projectTitle,
        t.purchaseDate,
        t.normalizedTitle,
        t.id
      )
      .where(sql`${t.archivedAt} IS NULL AND ${t.deletedAt} IS NULL`),
    index("idx_global_purchases_workspace_title").on(
      t.workspaceOwnerId,
      t.normalizedTitle
    ),
    index("idx_global_purchases_workspace_updated_at").on(
      t.workspaceOwnerId,
      t.updatedAt
    ),
    check("chk_global_purchases_title_not_empty", sql`btrim(${t.title}) <> ''`),
    check("chk_global_purchases_unit_not_empty", sql`btrim(${t.unit}) <> ''`),
    check(
      "chk_global_purchases_plan_quantity_non_negative",
      sql`${t.planQuantity} >= 0`
    ),
    check(
      "chk_global_purchases_plan_price_non_negative",
      sql`${t.planPrice} >= 0`
    ),
    check(
      "chk_global_purchases_fact_quantity_non_negative",
      sql`${t.factQuantity} IS NULL OR ${t.factQuantity} >= 0`
    ),
    check(
      "chk_global_purchases_fact_price_non_negative",
      sql`${t.factPrice} IS NULL OR ${t.factPrice} >= 0`
    ),
  ]
)
