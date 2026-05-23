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

export const projectEstimateRecordStatusEnum = pgEnum(
  "project_estimate_record_status",
  ["new", "in_progress", "completed"]
)

export const projectEstimateRecords = pgTable(
  "project_estimate_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    type: text("type").notNull().default("Основная"),
    status: projectEstimateRecordStatusEnum("status").notNull().default("new"),
    amount: numeric("amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
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
    uniqueIndex("uq_project_estimate_records_id_workspace").on(
      t.id,
      t.workspaceOwnerId
    ),
    uniqueIndex("uq_project_estimate_records_id_workspace_project").on(
      t.id,
      t.workspaceOwnerId,
      t.projectId
    ),
    index("idx_project_estimate_records_project_active").on(
      t.workspaceOwnerId,
      t.projectId,
      t.archivedAt,
      t.deletedAt,
      t.createdAt
    ),
    index("idx_project_estimate_records_status").on(
      t.workspaceOwnerId,
      t.status
    ),
    check(
      "chk_project_estimate_records_name_not_empty",
      sql`btrim(${t.name}) <> ''`
    ),
    check(
      "chk_project_estimate_records_type_not_empty",
      sql`btrim(${t.type}) <> ''`
    ),
    check(
      "chk_project_estimate_records_amount_non_negative",
      sql`${t.amount} >= 0`
    ),
  ]
)
