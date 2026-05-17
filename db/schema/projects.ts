import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { profiles } from "./profiles"

export const projectStatusEnum = pgEnum("project_status", [
  "new",
  "in_progress",
  "completed",
])

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    customerName: text("customer_name"),
    address: text("address"),
    budgetAmount: numeric("budget_amount", { precision: 14, scale: 2 }),
    startDate: text("start_date"),
    endDate: text("end_date"),
    status: projectStatusEnum("status").notNull().default("new"),
    progress: integer("progress").notNull().default(0),
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
    uniqueIndex("uq_projects_id_workspace").on(t.id, t.workspaceOwnerId),
    index("idx_projects_workspace_status_deleted").on(
      t.workspaceOwnerId,
      t.status,
      t.archivedAt,
      t.deletedAt
    ),
    index("idx_projects_workspace_normalized_title").on(
      t.workspaceOwnerId,
      t.normalizedTitle
    ),
    index("idx_projects_workspace_updated_at").on(t.workspaceOwnerId, t.updatedAt),
    check("chk_projects_title_not_empty", sql`btrim(${t.title}) <> ''`),
    check("chk_projects_progress_range", sql`${t.progress} >= 0 AND ${t.progress} <= 100`),
    check(
      "chk_projects_budget_non_negative",
      sql`${t.budgetAmount} IS NULL OR ${t.budgetAmount} >= 0`
    ),
  ]
)
