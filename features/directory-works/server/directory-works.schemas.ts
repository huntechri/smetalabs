import { z } from "zod"
import type {
  DirectoryWorkAiSearchInput,
  DirectoryWorksExportFormat,
  DirectoryWorksListParams,
} from "../model/directory-works-model"
import { normalizeDirectoryWorksListParams } from "./directory-works.search"

const MAX_IMPORT_FILE_SIZE_BYTES = 50 * 1024 * 1024
const MAX_IMPORT_BATCH_ROWS = 2000
const MAX_IMPORT_APPLY_BATCH_ROWS = 500

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined
    const trimmed = value.trim().replace(/\s+/g, " ")
    return trimmed.length > 0 ? trimmed : undefined
  }, z.string().max(maxLength).optional())

const nullableTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (value === null) return null
    if (typeof value !== "string") return undefined
    const trimmed = value.trim().replace(/\s+/g, " ")
    return trimmed.length > 0 ? trimmed : null
  }, z.string().max(maxLength).nullable().optional())

const requiredTrimmedString = (maxLength: number, message: string) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value
    return value.trim().replace(/\s+/g, " ")
  }, z.string().min(1, message).max(maxLength))

const rateAmountSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() !== "") return Number(value)
    return value
  },
  z.number().finite().min(0, "Расценка не может быть отрицательной")
)

const directoryWorkStatusSchema = z
  .enum(["active", "archived"])
  .default("active")
const directoryWorksSortSchema = z
  .enum(["relevance", "updated_desc", "title_asc"])
  .default("relevance")
const directoryWorkPriceKindSchema = z
  .enum(["base", "labor", "turnkey", "estimate", "custom"])
  .default("base")
const currencyCodeSchema = z
  .preprocess(
    (value) => {
      if (typeof value !== "string") return "RUB"
      const normalized = value.trim().toUpperCase()
      return normalized || "RUB"
    },
    z.string().regex(/^[A-Z]{3}$/, "Код валюты должен быть в ISO-формате")
  )
  .default("RUB")

const directoryWorksCursorSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 0
  return Number(value)
}, z.number().int().nonnegative().default(0))

const directoryWorksLimitSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 50
  return Number(value)
}, z.number().int().min(1).max(100).default(50))

const directoryWorksExportFormatSchema = z.enum(["csv", "xlsx"]).default("csv")

const importRowsSchema = z
  .array(z.record(z.string(), z.unknown()))
  .max(
    MAX_IMPORT_BATCH_ROWS,
    `За один пакет можно загрузить не более ${MAX_IMPORT_BATCH_ROWS} строк`
  )
  .default([])

const importFileSizeBytesSchema = z
  .preprocess((value) => {
    if (value === null || value === undefined || value === "") return null
    return Number(value)
  }, z.number().finite("Размер файла должен быть числом").int("Размер файла должен быть целым числом").nonnegative("Размер файла не может быть отрицательным").max(MAX_IMPORT_FILE_SIZE_BYTES, "Размер файла не должен превышать 50 МБ").nullable())
  .optional()

const insertAfterWorkIdSchema = z
  .preprocess((value) => {
    if (value === null || value === undefined || value === "") return null
    return value
  }, z.string().uuid().nullable())
  .optional()

export const directoryWorksListQuerySchema = z.object({
  q: optionalTrimmedString(240),
  category: optionalTrimmedString(120),
  subcategory: optionalTrimmedString(120),
  unit: optionalTrimmedString(80),
  status: directoryWorkStatusSchema,
  limit: directoryWorksLimitSchema,
  cursor: directoryWorksCursorSchema,
  sort: directoryWorksSortSchema,
  recommend: z.preprocess((val) => val === "true" || val === true, z.boolean().optional()),
})

export const directoryWorkMutationSchema = z
  .object({
    title: requiredTrimmedString(240, "Название обязательно"),
    unit: requiredTrimmedString(80, "Единица измерения обязательна"),
    rate: rateAmountSchema,
    category: requiredTrimmedString(120, "Категория обязательна"),
    subcategory: nullableTrimmedString(120),
    code: nullableTrimmedString(80),
    description: nullableTrimmedString(2000),
    includedOperations: nullableTrimmedString(4000),
    excludedOperations: nullableTrimmedString(4000),
    sourceName: nullableTrimmedString(120),
    sourceExternalRowKey: nullableTrimmedString(160),
    currencyCode: currencyCodeSchema,
    priceKind: directoryWorkPriceKindSchema,
    insertAfterWorkId: insertAfterWorkIdSchema,
  })
  .strict()

export const directoryWorkImportCreateSchema = z
  .object({
    rows: importRowsSchema,
    fileName: nullableTrimmedString(255),
    fileMimeType: nullableTrimmedString(120),
    fileSizeBytes: importFileSizeBytesSchema,
    sourceName: nullableTrimmedString(120),
    options: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export const directoryWorkImportBatchSchema = z
  .object({
    batchNumber: z.number().int().positive(),
    rowOffset: z.number().int().nonnegative(),
    rows: importRowsSchema,
    isLastBatch: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.isLastBatch || value.rows.length > 0, {
    message: "Пакет импорта не содержит строк",
    path: ["rows"],
  })

export const directoryWorkImportApplySchema = z
  .object({
    batchSize: z
      .preprocess((value) => {
        if (value === undefined || value === null || value === "") return 200
        return Number(value)
      }, z.number().int().min(1).max(MAX_IMPORT_APPLY_BATCH_ROWS))
      .default(200),
  })
  .strict()

export const directoryWorkAiSearchSchema = z
  .object({
    query: requiredTrimmedString(240, "Поисковый запрос обязателен"),
    category: optionalTrimmedString(120),
    subcategory: optionalTrimmedString(120),
    unit: optionalTrimmedString(80),
    limit: z
      .preprocess((value) => {
        if (value === undefined || value === null || value === "") return 20
        return Number(value)
      }, z.number().int().min(1).max(50))
      .default(20),
    threshold: z
      .preprocess((value) => {
        if (value === undefined || value === null || value === "") return 0.72
        return Number(value)
      }, z.number().finite().min(0).max(1))
      .default(0.72),
  })
  .strict()

export const directoryWorkEmbeddingProcessSchema = z
  .object({
    limit: z
      .preprocess((value) => {
        if (value === undefined || value === null || value === "") return 20
        return Number(value)
      }, z.number().int().min(1).max(20))
      .default(20),
  })
  .strict()

export const directoryWorkIdSchema = z.string().uuid()
export const directoryWorkCategoryStatusSchema = z
  .enum(["active", "archived"])
  .default("active")

export function parseDirectoryWorksListParams(
  searchParams: URLSearchParams
): Required<
  Pick<DirectoryWorksListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<DirectoryWorksListParams, "status" | "limit" | "cursor" | "sort"> {
  return normalizeDirectoryWorksListParams(
    directoryWorksListQuerySchema.parse(Object.fromEntries(searchParams))
  )
}

export function parseDirectoryWorksExportParams(
  searchParams: URLSearchParams
): { format: DirectoryWorksExportFormat; params: DirectoryWorksListParams } {
  const values = Object.fromEntries(searchParams)
  const format = directoryWorksExportFormatSchema.parse(values.format)
  delete values.format
  const params = normalizeDirectoryWorksListParams(
    directoryWorksListQuerySchema
      .omit({ limit: true, cursor: true })
      .parse(values)
  )
  return { format, params }
}

export function parseDirectoryWorkMutationBody(body: unknown) {
  return directoryWorkMutationSchema.parse(body)
}
export function parseDirectoryWorkImportCreateBody(body: unknown) {
  return directoryWorkImportCreateSchema.parse(body)
}
export function parseDirectoryWorkImportBatchBody(body: unknown) {
  return directoryWorkImportBatchSchema.parse(body)
}
export function parseDirectoryWorkImportApplyBody(body: unknown) {
  if (body === undefined || body === null)
    return directoryWorkImportApplySchema.parse({})
  return directoryWorkImportApplySchema.parse(body)
}
export function parseDirectoryWorkAiSearchBody(
  body: unknown
): DirectoryWorkAiSearchInput {
  return directoryWorkAiSearchSchema.parse(body)
}
export function parseDirectoryWorkEmbeddingProcessBody(body: unknown) {
  return directoryWorkEmbeddingProcessSchema.parse(body)
}
export function parseDirectoryWorkId(id: string) {
  return directoryWorkIdSchema.parse(id)
}
export function parseDirectoryWorkCategoryStatus(value: string | null) {
  return directoryWorkCategoryStatusSchema.parse(value ?? undefined)
}
