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

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector"
  },
})

export const directoryWorkStatusEnum = pgEnum("directory_work_status", [
  "active",
  "archived",
])

export const directoryWorkPriceKindEnum = pgEnum("directory_work_price_kind", [
  "base",
  "labor",
  "turnkey",
  "estimate",
  "custom",
])

export const directoryWorkTermSourceEnum = pgEnum(
  "directory_work_term_source",
  ["manual", "import", "ai_suggestion", "external"]
)

export const directoryWorkImportJobStatusEnum = pgEnum(
  "directory_work_import_job_status",
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

export const directoryWorkImportRowStatusEnum = pgEnum(
  "directory_work_import_row_status",
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

export const directoryWorkImportRowActionEnum = pgEnum(
  "directory_work_import_row_action",
  ["create", "update", "skip"]
)

export const directoryWorkEmbeddingStatusEnum = pgEnum(
  "directory_work_embedding_status",
  ["pending", "ready", "stale", "failed"]
)

export const directoryWorks = pgTable(
  "directory_works",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    unitCode: text("unit_code").notNull(),
    unitLabel: text("unit_label").notNull(),
    rateAmount: numeric("rate_amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .default("RUB"),
    priceKind: directoryWorkPriceKindEnum("price_kind")
      .notNull()
      .default("base"),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    code: text("code"),
    description: text("description"),
    includedOperations: text("included_operations"),
    excludedOperations: text("excluded_operations"),
    sourceName: text("source_name"),
    sourceExternalRowKey: text("source_external_row_key"),
    dedupeFingerprint: text("dedupe_fingerprint").notNull(),
    searchText: text("search_text").notNull(),
    searchFts: tsvector("search_fts").notNull(),
    status: directoryWorkStatusEnum("status").notNull().default("active"),
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
    uniqueIndex("uq_directory_works_id_workspace").on(t.id, t.workspaceOwnerId),
    index("idx_directory_works_workspace_status_deleted").on(
      t.workspaceOwnerId,
      t.status,
      t.deletedAt
    ),
    index("idx_directory_works_workspace_category_subcategory").on(
      t.workspaceOwnerId,
      t.category,
      t.subcategory
    ),
    index("idx_directory_works_workspace_normalized_title").on(
      t.workspaceOwnerId,
      t.normalizedTitle
    ),
    index("idx_directory_works_workspace_code").on(t.workspaceOwnerId, t.code),
    index("idx_directory_works_workspace_source_key").on(
      t.workspaceOwnerId,
      t.sourceName,
      t.sourceExternalRowKey
    ),
    index("idx_directory_works_workspace_dedupe").on(
      t.workspaceOwnerId,
      t.dedupeFingerprint
    ),
    index("idx_directory_works_workspace_updated_at").on(
      t.workspaceOwnerId,
      t.updatedAt
    ),
    check("chk_directory_works_title_not_empty", sql`btrim(${t.title}) <> ''`),
    check(
      "chk_directory_works_unit_code_not_empty",
      sql`btrim(${t.unitCode}) <> ''`
    ),
    check(
      "chk_directory_works_unit_label_not_empty",
      sql`btrim(${t.unitLabel}) <> ''`
    ),
    check(
      "chk_directory_works_category_not_empty",
      sql`btrim(${t.category}) <> ''`
    ),
    check("chk_directory_works_rate_non_negative", sql`${t.rateAmount} >= 0`),
    check("chk_directory_works_version_positive", sql`${t.version} > 0`),
    check(
      "chk_directory_works_currency_uppercase",
      sql`${t.currencyCode} ~ '^[A-Z]{3}$'`
    ),
  ]
)

export const workAliases = pgTable(
  "work_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    workId: uuid("work_id").notNull(),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    source: directoryWorkTermSourceEnum("source").notNull().default("manual"),
    weight: integer("weight").notNull().default(1),
    createdBy: uuid("created_by").references(() => profiles.id, {
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
    foreignKey({
      name: "fk_work_aliases_work_workspace",
      columns: [t.workId, t.workspaceOwnerId],
      foreignColumns: [directoryWorks.id, directoryWorks.workspaceOwnerId],
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    uniqueIndex("uq_work_aliases_workspace_work_alias_active")
      .on(t.workspaceOwnerId, t.workId, t.normalizedAlias)
      .where(sql`${t.deletedAt} IS NULL`),
    index("idx_work_aliases_workspace_work").on(t.workspaceOwnerId, t.workId),
    index("idx_work_aliases_workspace_normalized_alias").on(
      t.workspaceOwnerId,
      t.normalizedAlias
    ),
    check("chk_work_aliases_alias_not_empty", sql`btrim(${t.alias}) <> ''`),
    check("chk_work_aliases_weight_positive", sql`${t.weight} > 0`),
  ]
)

export const workKeywords = pgTable(
  "work_keywords",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    workId: uuid("work_id").notNull(),
    keyword: text("keyword").notNull(),
    normalizedKeyword: text("normalized_keyword").notNull(),
    source: directoryWorkTermSourceEnum("source").notNull().default("manual"),
    weight: integer("weight").notNull().default(1),
    createdBy: uuid("created_by").references(() => profiles.id, {
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
    foreignKey({
      name: "fk_work_keywords_work_workspace",
      columns: [t.workId, t.workspaceOwnerId],
      foreignColumns: [directoryWorks.id, directoryWorks.workspaceOwnerId],
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    uniqueIndex("uq_work_keywords_workspace_work_keyword_active")
      .on(t.workspaceOwnerId, t.workId, t.normalizedKeyword)
      .where(sql`${t.deletedAt} IS NULL`),
    index("idx_work_keywords_workspace_work").on(t.workspaceOwnerId, t.workId),
    index("idx_work_keywords_workspace_normalized_keyword").on(
      t.workspaceOwnerId,
      t.normalizedKeyword
    ),
    check(
      "chk_work_keywords_keyword_not_empty",
      sql`btrim(${t.keyword}) <> ''`
    ),
    check("chk_work_keywords_weight_positive", sql`${t.weight} > 0`),
  ]
)

export const directoryWorkImportJobs = pgTable(
  "directory_work_import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    status: directoryWorkImportJobStatusEnum("status")
      .notNull()
      .default("draft"),
    sourceName: text("source_name"),
    fileName: text("file_name"),
    fileMimeType: text("file_mime_type"),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    storageBucket: text("storage_bucket"),
    storagePath: text("storage_path"),
    totalRows: integer("total_rows").notNull().default(0),
    parsedRows: integer("parsed_rows").notNull().default(0),
    validRows: integer("valid_rows").notNull().default(0),
    warningRows: integer("warning_rows").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    duplicateRows: integer("duplicate_rows").notNull().default(0),
    conflictRows: integer("conflict_rows").notNull().default(0),
    appliedRows: integer("applied_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    options: jsonb("options")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    summary: jsonb("summary")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
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
    uniqueIndex("uq_directory_work_import_jobs_id_workspace").on(
      t.id,
      t.workspaceOwnerId
    ),
    index("idx_directory_work_import_jobs_workspace_status_created").on(
      t.workspaceOwnerId,
      t.status,
      t.createdAt
    ),
    check(
      "chk_directory_work_import_jobs_total_rows_non_negative",
      sql`${t.totalRows} >= 0`
    ),
    check(
      "chk_directory_work_import_jobs_parsed_rows_non_negative",
      sql`${t.parsedRows} >= 0`
    ),
    check(
      "chk_directory_work_import_jobs_valid_rows_non_negative",
      sql`${t.validRows} >= 0`
    ),
    check(
      "chk_directory_work_import_jobs_warning_rows_non_negative",
      sql`${t.warningRows} >= 0`
    ),
    check(
      "chk_directory_work_import_jobs_error_rows_non_negative",
      sql`${t.errorRows} >= 0`
    ),
    check(
      "chk_directory_work_import_jobs_duplicate_rows_non_negative",
      sql`${t.duplicateRows} >= 0`
    ),
    check(
      "chk_directory_work_import_jobs_conflict_rows_non_negative",
      sql`${t.conflictRows} >= 0`
    ),
    check(
      "chk_directory_work_import_jobs_applied_rows_non_negative",
      sql`${t.appliedRows} >= 0`
    ),
    check(
      "chk_directory_work_import_jobs_skipped_rows_non_negative",
      sql`${t.skippedRows} >= 0`
    ),
  ]
)

export const directoryWorkImportRows = pgTable(
  "directory_work_import_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").notNull(),
    rowNumber: integer("row_number").notNull(),
    rawData: jsonb("raw_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    normalizedData: jsonb("normalized_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: directoryWorkImportRowStatusEnum("status")
      .notNull()
      .default("pending"),
    action: directoryWorkImportRowActionEnum("action"),
    errorMessages: jsonb("error_messages")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    warningMessages: jsonb("warning_messages")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    duplicateWorkId: uuid("duplicate_work_id").references(
      () => directoryWorks.id,
      { onDelete: "set null" }
    ),
    conflictWorkIds: uuid("conflict_work_ids").array(),
    dedupeFingerprint: text("dedupe_fingerprint"),
    appliedWorkId: uuid("applied_work_id").references(() => directoryWorks.id, {
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
    foreignKey({
      name: "fk_directory_work_import_rows_job_workspace",
      columns: [t.jobId, t.workspaceOwnerId],
      foreignColumns: [
        directoryWorkImportJobs.id,
        directoryWorkImportJobs.workspaceOwnerId,
      ],
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    uniqueIndex("uq_directory_work_import_rows_job_row_number").on(
      t.jobId,
      t.rowNumber
    ),
    index("idx_directory_work_import_rows_workspace_job_status").on(
      t.workspaceOwnerId,
      t.jobId,
      t.status
    ),
    index("idx_directory_work_import_rows_workspace_dedupe").on(
      t.workspaceOwnerId,
      t.dedupeFingerprint
    ),
    check(
      "chk_directory_work_import_rows_row_number_positive",
      sql`${t.rowNumber} > 0`
    ),
  ]
)

export const directoryWorkEmbeddings = pgTable(
  "directory_work_embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceOwnerId: uuid("workspace_owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    workId: uuid("work_id").notNull(),
    modelName: text("model_name").notNull(),
    dimensions: integer("dimensions").notNull(),
    contentHash: text("content_hash").notNull(),
    embedding: vector("embedding"),
    status: directoryWorkEmbeddingStatusEnum("status")
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
      name: "fk_directory_work_embeddings_work_workspace",
      columns: [t.workId, t.workspaceOwnerId],
      foreignColumns: [directoryWorks.id, directoryWorks.workspaceOwnerId],
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    uniqueIndex("uq_directory_work_embeddings_work_model_hash").on(
      t.workspaceOwnerId,
      t.workId,
      t.modelName,
      t.contentHash
    ),
    index("idx_directory_work_embeddings_workspace_status").on(
      t.workspaceOwnerId,
      t.status
    ),
    index("idx_directory_work_embeddings_workspace_work").on(
      t.workspaceOwnerId,
      t.workId
    ),
    check(
      "chk_directory_work_embeddings_model_name_not_empty",
      sql`btrim(${t.modelName}) <> ''`
    ),
    check(
      "chk_directory_work_embeddings_dimensions_positive",
      sql`${t.dimensions} > 0`
    ),
    check(
      "chk_directory_work_embeddings_content_hash_not_empty",
      sql`btrim(${t.contentHash}) <> ''`
    ),
    check(
      "chk_directory_work_embeddings_input_not_empty",
      sql`btrim(${t.embeddingInputText}) <> ''`
    ),
  ]
)
