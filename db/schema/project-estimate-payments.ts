import { sql } from "drizzle-orm"
import {
  check,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { profiles } from "./profiles"
import { projectEstimateSections } from "./project-estimate-content"
import { projectEstimateRecords } from "./project-estimate-records"

export const projectEstimatePayments = pgTable(
  "project_estimate_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    estimateRecordId: uuid("estimate_record_id")
      .notNull()
      .references(() => projectEstimateRecords.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .references(() => projectEstimateSections.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    date: text("date").notNull(),
    status: text("status").notNull().default("expected"),
    purpose: text("purpose").notNull().default(""),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_pepay_estimate").on(
      t.estimateRecordId,
      t.workspaceOwnerId
    ),
    index("idx_pepay_section").on(
      t.sectionId
    ),
    check(
      "chk_pepay_amount_non_negative",
      sql`${t.amount} >= 0`
    ),
  ]
)
