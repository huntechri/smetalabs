import { sql } from "drizzle-orm"
import {
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { directoryMaterials } from "./directory-materials"
import { directoryWorks } from "./directory-works"
import { profiles } from "./profiles"
import { projectEstimateRecords } from "./project-estimate-records"

export const projectEstimateSections = pgTable(
  "project_estimate_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    estimateRecordId: uuid("estimate_record_id").notNull(),
    title: text("title").notNull(),
    number: text("number").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    worksAmount: numeric("works_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    materialsAmount: numeric("materials_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 })
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
    uniqueIndex("uq_project_estimate_sections_id_workspace_project_record").on(
      t.id,
      t.workspaceOwnerId,
      t.projectId,
      t.estimateRecordId
    ),
    foreignKey({
      name: "fk_project_estimate_sections_record_workspace_project",
      columns: [t.estimateRecordId, t.workspaceOwnerId, t.projectId],
      foreignColumns: [
        projectEstimateRecords.id,
        projectEstimateRecords.workspaceOwnerId,
        projectEstimateRecords.projectId,
      ],
    }).onDelete("cascade"),
    index("idx_project_estimate_sections_record_active").on(
      t.workspaceOwnerId,
      t.projectId,
      t.estimateRecordId,
      t.archivedAt,
      t.deletedAt,
      t.sortOrder,
      t.id
    ),
    check(
      "chk_project_estimate_sections_title_not_empty",
      sql`btrim(${t.title}) <> ''`
    ),
    check(
      "chk_project_estimate_sections_number_not_empty",
      sql`btrim(${t.number}) <> ''`
    ),
    check(
      "chk_project_estimate_sections_amounts_non_negative",
      sql`${t.worksAmount} >= 0 AND ${t.materialsAmount} >= 0 AND ${t.totalAmount} >= 0`
    ),
  ]
)

export const projectEstimateWorks = pgTable(
  "project_estimate_works",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    estimateRecordId: uuid("estimate_record_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    directoryWorkId: uuid("directory_work_id"),
    directoryWorkVersion: integer("directory_work_version"),
    number: text("number").notNull(),
    code: text("code"),
    title: text("title").notNull(),
    unitCode: text("unit_code").notNull(),
    unitLabel: text("unit_label").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),
    price: numeric("price", { precision: 14, scale: 2 }).notNull().default("0"),
    factQuantity: numeric("fact_quantity", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),
    factPrice: numeric("fact_price", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    category: text("category"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
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
    uniqueIndex(
      "uq_project_estimate_works_id_workspace_project_record_section"
    ).on(
      t.id,
      t.workspaceOwnerId,
      t.projectId,
      t.estimateRecordId,
      t.sectionId
    ),
    foreignKey({
      name: "fk_project_estimate_works_record_workspace_project",
      columns: [t.estimateRecordId, t.workspaceOwnerId, t.projectId],
      foreignColumns: [
        projectEstimateRecords.id,
        projectEstimateRecords.workspaceOwnerId,
        projectEstimateRecords.projectId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_project_estimate_works_section_workspace_project_record",
      columns: [
        t.sectionId,
        t.workspaceOwnerId,
        t.projectId,
        t.estimateRecordId,
      ],
      foreignColumns: [
        projectEstimateSections.id,
        projectEstimateSections.workspaceOwnerId,
        projectEstimateSections.projectId,
        projectEstimateSections.estimateRecordId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_project_estimate_works_directory_work_workspace",
      columns: [t.directoryWorkId, t.workspaceOwnerId],
      foreignColumns: [directoryWorks.id, directoryWorks.workspaceOwnerId],
    }).onDelete("restrict"),
    index("idx_project_estimate_works_section_active").on(
      t.workspaceOwnerId,
      t.projectId,
      t.estimateRecordId,
      t.sectionId,
      t.archivedAt,
      t.deletedAt,
      t.sortOrder,
      t.id
    ),
    index("idx_project_estimate_works_directory_work")
      .on(t.workspaceOwnerId, t.directoryWorkId)
      .where(sql`${t.directoryWorkId} IS NOT NULL`),
    check(
      "chk_project_estimate_works_number_not_empty",
      sql`btrim(${t.number}) <> ''`
    ),
    check(
      "chk_project_estimate_works_title_not_empty",
      sql`btrim(${t.title}) <> ''`
    ),
    check(
      "chk_project_estimate_works_unit_code_not_empty",
      sql`btrim(${t.unitCode}) <> ''`
    ),
    check(
      "chk_project_estimate_works_unit_label_not_empty",
      sql`btrim(${t.unitLabel}) <> ''`
    ),
    check(
      "chk_project_estimate_works_quantity_non_negative",
      sql`${t.quantity} >= 0`
    ),
    check(
      "chk_project_estimate_works_price_non_negative",
      sql`${t.price} >= 0`
    ),
    check(
      "chk_project_estimate_works_fact_quantity_non_negative",
      sql`${t.factQuantity} >= 0`
    ),
    check(
      "chk_project_estimate_works_fact_price_non_negative",
      sql`${t.factPrice} >= 0`
    ),
    check(
      "chk_project_estimate_works_total_non_negative",
      sql`${t.totalAmount} >= 0`
    ),
    check(
      "chk_project_estimate_works_directory_version_positive",
      sql`${t.directoryWorkVersion} IS NULL OR ${t.directoryWorkVersion} > 0`
    ),
  ]
)

export const projectEstimateMaterials = pgTable(
  "project_estimate_materials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    estimateRecordId: uuid("estimate_record_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    workId: uuid("work_id").notNull(),
    directoryMaterialId: uuid("directory_material_id"),
    directoryMaterialVersion: integer("directory_material_version"),
    number: text("number").notNull(),
    code: text("code"),
    title: text("title").notNull(),
    unitCode: text("unit_code").notNull(),
    unitLabel: text("unit_label").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),
    consumption: numeric("consumption", { precision: 14, scale: 6 }),
    price: numeric("price", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    supplierName: text("supplier_name"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
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
    foreignKey({
      name: "fk_project_estimate_materials_record_workspace_project",
      columns: [t.estimateRecordId, t.workspaceOwnerId, t.projectId],
      foreignColumns: [
        projectEstimateRecords.id,
        projectEstimateRecords.workspaceOwnerId,
        projectEstimateRecords.projectId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_project_estimate_materials_section_workspace_project_record",
      columns: [
        t.sectionId,
        t.workspaceOwnerId,
        t.projectId,
        t.estimateRecordId,
      ],
      foreignColumns: [
        projectEstimateSections.id,
        projectEstimateSections.workspaceOwnerId,
        projectEstimateSections.projectId,
        projectEstimateSections.estimateRecordId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_project_estimate_materials_work_workspace_project_record_section",
      columns: [
        t.workId,
        t.workspaceOwnerId,
        t.projectId,
        t.estimateRecordId,
        t.sectionId,
      ],
      foreignColumns: [
        projectEstimateWorks.id,
        projectEstimateWorks.workspaceOwnerId,
        projectEstimateWorks.projectId,
        projectEstimateWorks.estimateRecordId,
        projectEstimateWorks.sectionId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_project_estimate_materials_directory_material_workspace",
      columns: [t.directoryMaterialId, t.workspaceOwnerId],
      foreignColumns: [
        directoryMaterials.id,
        directoryMaterials.workspaceOwnerId,
      ],
    }).onDelete("restrict"),
    index("idx_project_estimate_materials_work_active").on(
      t.workspaceOwnerId,
      t.projectId,
      t.estimateRecordId,
      t.sectionId,
      t.workId,
      t.archivedAt,
      t.deletedAt,
      t.sortOrder,
      t.id
    ),
    index("idx_project_estimate_materials_section_active").on(
      t.workspaceOwnerId,
      t.projectId,
      t.estimateRecordId,
      t.sectionId,
      t.archivedAt,
      t.deletedAt,
      t.sortOrder,
      t.id
    ),
    index("idx_project_estimate_materials_directory_material")
      .on(t.workspaceOwnerId, t.directoryMaterialId)
      .where(sql`${t.directoryMaterialId} IS NOT NULL`),
    check(
      "chk_project_estimate_materials_number_not_empty",
      sql`btrim(${t.number}) <> ''`
    ),
    check(
      "chk_project_estimate_materials_title_not_empty",
      sql`btrim(${t.title}) <> ''`
    ),
    check(
      "chk_project_estimate_materials_unit_code_not_empty",
      sql`btrim(${t.unitCode}) <> ''`
    ),
    check(
      "chk_project_estimate_materials_unit_label_not_empty",
      sql`btrim(${t.unitLabel}) <> ''`
    ),
    check(
      "chk_project_estimate_materials_quantity_non_negative",
      sql`${t.quantity} >= 0`
    ),
    check(
      "chk_project_estimate_materials_consumption_positive",
      sql`${t.consumption} IS NULL OR ${t.consumption} > 0`
    ),
    check(
      "chk_project_estimate_materials_price_non_negative",
      sql`${t.price} >= 0`
    ),
    check(
      "chk_project_estimate_materials_total_non_negative",
      sql`${t.totalAmount} >= 0`
    ),
    check(
      "chk_project_estimate_materials_directory_version_positive",
      sql`${t.directoryMaterialVersion} IS NULL OR ${t.directoryMaterialVersion} > 0`
    ),
  ]
)
