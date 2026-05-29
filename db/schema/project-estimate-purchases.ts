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

import { directoryMaterials } from "./directory-materials"
import { profiles } from "./profiles"
import { projectEstimateMaterials } from "./project-estimate-content"
import { projectEstimateRecords } from "./project-estimate-records"

export const projectEstimatePurchases = pgTable(
  "project_estimate_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    estimateRecordId: uuid("estimate_record_id")
      .notNull()
      .references(() => projectEstimateRecords.id, { onDelete: "cascade" }),
    directoryMaterialId: uuid("directory_material_id").references(
      () => directoryMaterials.id,
      { onDelete: "set null" }
    ),
    estimateMaterialId: uuid("estimate_material_id").references(
      () => projectEstimateMaterials.id,
      { onDelete: "set null" }
    ),
    title: text("title").notNull(),
    unit: text("unit").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),
    price: numeric("price", { precision: 14, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
    supplierName: text("supplier_name"),
    purchaseDate: text("purchase_date"),
    notes: text("notes"),
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
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_pep_estimate").on(t.estimateRecordId, t.workspaceOwnerId),
    index("idx_pep_material")
      .on(t.estimateRecordId, t.directoryMaterialId)
      .where(sql`${t.directoryMaterialId} IS NOT NULL`),
    index("idx_pep_archived").on(t.workspaceOwnerId, t.archivedAt),
    check("chk_pep_title_not_empty", sql`btrim(${t.title}) <> ''`),
    check("chk_pep_unit_not_empty", sql`btrim(${t.unit}) <> ''`),
    check("chk_pep_quantity_non_negative", sql`${t.quantity} >= 0`),
    check("chk_pep_price_non_negative", sql`${t.price} >= 0`),
    check("chk_pep_total_non_negative", sql`${t.total} >= 0`),
  ]
)
