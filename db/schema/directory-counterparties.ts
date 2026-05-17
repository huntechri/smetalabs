import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { profiles } from "./profiles"

export const directoryCounterpartyTypeEnum = pgEnum("directory_counterparty_type", [
  "customer",
  "contractor",
])

export const directoryCounterpartyLegalStatusEnum = pgEnum(
  "directory_counterparty_legal_status",
  ["juridical", "individual"]
)

export const directoryCounterpartyStatusEnum = pgEnum("directory_counterparty_status", [
  "active",
  "archived",
])

export const directoryCounterparties = pgTable(
  "directory_counterparties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    type: directoryCounterpartyTypeEnum("type").notNull(),
    legalStatus: directoryCounterpartyLegalStatusEnum("legal_status").notNull(),
    inn: text("inn"),
    phone: text("phone"),
    legalAddress: text("legal_address"),
    bankName: text("bank_name"),
    bik: text("bik"),
    corrAccount: text("corr_account"),
    accountNumber: text("account_number"),
    passportSeries: text("passport_series"),
    passportNumber: text("passport_number"),
    passportIssuedBy: text("passport_issued_by"),
    passportIssueDate: text("passport_issue_date"),
    passportDepartmentCode: text("passport_department_code"),
    registrationAddress: text("registration_address"),
    searchText: text("search_text").notNull(),
    status: directoryCounterpartyStatusEnum("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
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
    uniqueIndex("uq_directory_counterparties_id_workspace").on(
      t.id,
      t.workspaceOwnerId
    ),
    uniqueIndex("uq_directory_counterparties_workspace_inn_active")
      .on(t.workspaceOwnerId, t.inn)
      .where(sql`${t.inn} IS NOT NULL AND ${t.deletedAt} IS NULL`),
    index("idx_directory_counterparties_workspace_status_deleted").on(
      t.workspaceOwnerId,
      t.status,
      t.deletedAt
    ),
    index("idx_directory_counterparties_workspace_type").on(
      t.workspaceOwnerId,
      t.type
    ),
    index("idx_directory_counterparties_workspace_legal_status").on(
      t.workspaceOwnerId,
      t.legalStatus
    ),
    index("idx_directory_counterparties_workspace_normalized_name").on(
      t.workspaceOwnerId,
      t.normalizedName
    ),
    index("idx_directory_counterparties_workspace_updated_at").on(
      t.workspaceOwnerId,
      t.updatedAt
    ),
    check("chk_directory_counterparties_name_not_empty", sql`btrim(${t.name}) <> ''`),
    check("chk_directory_counterparties_version_positive", sql`${t.version} > 0`),
  ]
)
