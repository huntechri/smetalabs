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

export const directorySupplierStatusEnum = pgEnum("directory_supplier_status", [
  "active",
  "archived",
])

export const directorySupplierLegalStatusEnum = pgEnum("directory_supplier_legal_status", [
  "juridical",
  "individual",
])

export const directorySuppliers = pgTable(
  "directory_suppliers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    legalStatus: directorySupplierLegalStatusEnum("legal_status").notNull(),
    color: text("color").notNull().default("#64748B"),
    inn: text("inn"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    status: directorySupplierStatusEnum("status").notNull().default("active"),
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
    uniqueIndex("uq_directory_suppliers_id_workspace").on(
      t.id,
      t.workspaceOwnerId
    ),
    uniqueIndex("uq_directory_suppliers_workspace_inn_active")
      .on(t.workspaceOwnerId, t.inn)
      .where(sql`${t.inn} IS NOT NULL AND ${t.deletedAt} IS NULL`),
    index("idx_directory_suppliers_workspace_status_deleted").on(
      t.workspaceOwnerId,
      t.status,
      t.deletedAt
    ),
    index("idx_directory_suppliers_workspace_normalized_name").on(
      t.workspaceOwnerId,
      t.normalizedName
    ),
    index("idx_directory_suppliers_workspace_updated_at").on(
      t.workspaceOwnerId,
      t.updatedAt
    ),
    check("chk_directory_suppliers_name_not_empty", sql`btrim(${t.name}) <> ''`),
    check("chk_directory_suppliers_normalized_name_not_empty", sql`btrim(${t.normalizedName}) <> ''`),
    check("chk_directory_suppliers_version_positive", sql`${t.version} > 0`),
    check("chk_directory_suppliers_color_hex", sql`${t.color} ~ '^#[0-9A-Fa-f]{6}$'`),
  ]
)
