import { sql } from "drizzle-orm"
import {
  bigint,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { profiles } from "./profiles"

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector"
  },
})

const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)"
  },
})

export const directoryMaterialStatusEnum = pgEnum("directory_material_status", [
  "active",
  "archived",
])

export const directoryMaterialEmbeddingStatusEnum = pgEnum(
  "directory_material_embedding_status",
  ["pending", "ready", "stale", "failed"]
)

export const directoryMaterialImportJobStatusEnum = pgEnum(
  "directory_material_import_job_status",
  [
    "draft",
    "uploaded",
    "parsing",
    "parsed",
    "validating",
    "validated",
    "ready_for_review",
    "applying",
    "completed",
    "failed",
    "cancelled",
  ]
)

export const directoryMaterialImportRowStatusEnum = pgEnum(
  "directory_material_import_row_status",
  [
    "pending",
    "valid",
    "warning",
    "error",
    "duplicate",
    "conflict",
    "applied",
    "skipped",
  ]
)

export const directoryMaterialImportRowActionEnum = pgEnum(
  "directory_material_import_row_action",
  ["create", "update", "skip"]
)

export const directoryMaterials = pgTable(
  "directory_materials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    unitCode: text("unit_code").notNull(),
    unitLabel: text("unit_label").notNull(),
    priceAmount: numeric("price_amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("RUB"),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    code: text("code"),
    supplierName: text("supplier_name"),
    supplierId: uuid("supplier_id"),
    imageUrl: text("image_url"),
    description: text("description"),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    keywords: text("keywords").array().notNull().default(sql`'{}'::text[]`),
    sourceName: text("source_name"),
    sourceExternalRowKey: text("source_external_row_key"),
    dedupeFingerprint: text("dedupe_fingerprint").notNull(),
    searchText: text("search_text").notNull(),
    searchFts: tsvector("search_fts").notNull(),
    status: directoryMaterialStatusEnum("status").notNull().default("active"),
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
    uniqueIndex("uq_directory_materials_id_workspace").on(
      t.id,
      t.workspaceOwnerId
    ),
    uniqueIndex("uq_directory_materials_workspace_code_active")
      .on(t.workspaceOwnerId, t.code)
      .where(sql`${t.code} IS NOT NULL AND ${t.deletedAt} IS NULL`),
    uniqueIndex("uq_directory_materials_workspace_source_key_active")
      .on(t.workspaceOwnerId, t.sourceName, t.sourceExternalRowKey)
      .where(
        sql`${t.sourceName} IS NOT NULL AND ${t.sourceExternalRowKey} IS NOT NULL AND ${t.deletedAt} IS NULL`
      ),
    index("idx_directory_materials_workspace_status_deleted").on(
      t.workspaceOwnerId,
      t.status,
      t.deletedAt
    ),
    index("idx_directory_materials_workspace_category_subcategory").on(
      t.workspaceOwnerId,
      t.category,
      t.subcategory
    ),
    index("idx_directory_materials_workspace_unit").on(
      t.workspaceOwnerId,
      t.unitCode
    ),
    index("idx_directory_materials_workspace_normalized_name").on(
      t.workspaceOwnerId,
      t.normalizedName
    ),
    index("idx_directory_materials_workspace_supplier_name").on(
      t.workspaceOwnerId,
      t.supplierName
    ),
    index("idx_directory_materials_workspace_dedupe").on(
      t.workspaceOwnerId,
      t.dedupeFingerprint
    ),
    index("idx_directory_materials_workspace_updated_at").on(
      t.workspaceOwnerId,
      t.updatedAt
    ),
    check("chk_directory_materials_name_not_empty", sql`btrim(${t.name}) <> ''`),
    check("chk_directory_materials_unit_code_not_empty", sql`btrim(${t.unitCode}) <> ''`),
    check("chk_directory_materials_unit_label_not_empty", sql`btrim(${t.unitLabel}) <> ''`),
    check("chk_directory_materials_category_not_empty", sql`btrim(${t.category}) <> ''`),
    check("chk_directory_materials_price_non_negative", sql`${t.priceAmount} >= 0`),
    check("chk_directory_materials_version_positive", sql`${t.version} > 0`),
    check(
      "chk_directory_materials_currency_uppercase",
      sql`${t.currencyCode} ~ '^[A-Z]{3}$'`
    ),
  ]
)

export const directoryMaterialEmbeddings = pgTable(
  "directory_material_embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    materialId: uuid("material_id").notNull(),
    modelName: text("model_name").notNull(),
    dimensions: integer("dimensions").notNull(),
    contentHash: text("content_hash").notNull(),
    embedding: vector1536("embedding"),
    status: directoryMaterialEmbeddingStatusEnum("status")
      .notNull()
      .default("pending"),
    embeddingInputText: text("embedding_input_text").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "fk_directory_material_embeddings_material_workspace",
      columns: [t.materialId, t.workspaceOwnerId],
      foreignColumns: [directoryMaterials.id, directoryMaterials.workspaceOwnerId],
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    uniqueIndex("uq_directory_material_embeddings_material_model_hash").on(
      t.workspaceOwnerId,
      t.materialId,
      t.modelName,
      t.contentHash
    ),
    index("idx_directory_material_embeddings_workspace_status").on(
      t.workspaceOwnerId,
      t.status
    ),
    index("idx_directory_material_embeddings_workspace_material").on(
      t.workspaceOwnerId,
      t.materialId
    ),
    index("idx_directory_material_embeddings_ready_model")
      .on(t.workspaceOwnerId, t.modelName, t.dimensions, t.status, t.updatedAt)
      .where(sql`${t.status} = 'ready'`),
    check("chk_directory_material_embeddings_model_name_not_empty", sql`btrim(${t.modelName}) <> ''`),
    check("chk_directory_material_embeddings_dimensions_positive", sql`${t.dimensions} > 0`),
    check("chk_directory_material_embeddings_content_hash_not_empty", sql`btrim(${t.contentHash}) <> ''`),
    check(
      "chk_directory_material_embeddings_input_not_empty",
      sql`btrim(${t.embeddingInputText}) <> ''`
    ),
  ]
)

export const directoryMaterialImportJobs = pgTable(
  "directory_material_import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    status: directoryMaterialImportJobStatusEnum("status")
      .notNull()
      .default("draft"),
    sourceName: text("source_name"),
    fileName: text("file_name"),
    fileMimeType: text("file_mime_type"),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    totalRows: integer("total_rows").notNull().default(0),
    parsedRows: integer("parsed_rows").notNull().default(0),
    validRows: integer("valid_rows").notNull().default(0),
    warningRows: integer("warning_rows").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    duplicateRows: integer("duplicate_rows").notNull().default(0),
    conflictRows: integer("conflict_rows").notNull().default(0),
    appliedRows: integer("applied_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    options: jsonb("options").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    lastError: text("last_error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_directory_material_import_jobs_id_workspace").on(
      t.id,
      t.workspaceOwnerId
    ),
    index("idx_directory_material_import_jobs_workspace_status_created").on(
      t.workspaceOwnerId,
      t.status,
      t.createdAt
    ),
    check(
      "chk_directory_material_import_jobs_counts_non_negative",
      sql`${t.totalRows} >= 0 AND ${t.parsedRows} >= 0 AND ${t.validRows} >= 0 AND ${t.warningRows} >= 0 AND ${t.errorRows} >= 0 AND ${t.duplicateRows} >= 0 AND ${t.conflictRows} >= 0 AND ${t.appliedRows} >= 0 AND ${t.skippedRows} >= 0`
    ),
    check(
      "chk_directory_material_import_jobs_file_size_non_negative",
      sql`${t.fileSizeBytes} IS NULL OR ${t.fileSizeBytes} >= 0`
    ),
  ]
)

export const directoryMaterialImportRows = pgTable(
  "directory_material_import_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").notNull(),
    rowNumber: integer("row_number").notNull(),
    rawData: jsonb("raw_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    normalizedData: jsonb("normalized_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    status: directoryMaterialImportRowStatusEnum("status")
      .notNull()
      .default("pending"),
    action: directoryMaterialImportRowActionEnum("action"),
    errorMessages: jsonb("error_messages").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    warningMessages: jsonb("warning_messages").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    duplicateMaterialId: uuid("duplicate_material_id").references(() => directoryMaterials.id, {
      onDelete: "set null",
    }),
    conflictMaterialIds: uuid("conflict_material_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    dedupeFingerprint: text("dedupe_fingerprint"),
    appliedMaterialId: uuid("applied_material_id").references(() => directoryMaterials.id, {
      onDelete: "set null",
    }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_directory_material_import_rows_job_row").on(
      t.workspaceOwnerId,
      t.jobId,
      t.rowNumber
    ),
    foreignKey({
      name: "fk_directory_material_import_rows_job_workspace",
      columns: [t.jobId, t.workspaceOwnerId],
      foreignColumns: [
        directoryMaterialImportJobs.id,
        directoryMaterialImportJobs.workspaceOwnerId,
      ],
    }).onDelete("cascade"),
    index("idx_directory_material_import_rows_workspace_job_status").on(
      t.workspaceOwnerId,
      t.jobId,
      t.status
    ),
    index("idx_directory_material_import_rows_workspace_dedupe")
      .on(t.workspaceOwnerId, t.dedupeFingerprint)
      .where(sql`${t.dedupeFingerprint} IS NOT NULL`),
    check("chk_directory_material_import_rows_row_number_positive", sql`${t.rowNumber} > 0`),
    check(
      "chk_directory_material_import_rows_error_messages_array",
      sql`jsonb_typeof(${t.errorMessages}) = 'array'`
    ),
    check(
      "chk_directory_material_import_rows_warning_messages_array",
      sql`jsonb_typeof(${t.warningMessages}) = 'array'`
    ),
  ]
)
