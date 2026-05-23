import { z } from "zod"
import type {
  DirectoryMaterialsCategoriesParams,
  DirectoryMaterialsListParams,
} from "../types"

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

const stringListSchema = z
  .preprocess(
    (value) => {
      if (Array.isArray(value)) return value
      if (typeof value === "string") {
        return value
          .split(/[;,|]/g)
          .map((item) => item.trim())
          .filter(Boolean)
      }
      return []
    },
    z.array(z.string().trim().min(1).max(120)).max(50)
  )
  .default([])

const priceAmountSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() !== "") return Number(value)
    return value
  },
  z.number().finite().min(0, "Цена не может быть отрицательной")
)

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

const directoryMaterialStatusSchema = z
  .enum(["active", "archived"])
  .default("active")
const directoryMaterialsSortSchema = z
  .enum(["relevance", "updated_desc", "name_asc"])
  .default("relevance")
const directoryMaterialsCursorSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 0
  return Number(value)
}, z.number().int().nonnegative().default(0))
const directoryMaterialsLimitSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 50
  return Number(value)
}, z.number().int().min(1).max(100).default(50))
const directoryMaterialsExportLimitSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 5000
  return Number(value)
}, z.number().int().min(1).max(5000).default(5000))
const directoryMaterialAiLimitSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 20
  return Number(value)
}, z.number().int().min(1).max(50).default(20))
const directoryMaterialAiThresholdSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 0.72
  return Number(value)
}, z.number().min(0).max(1).default(0.72))
const directoryMaterialEmbeddingLimitSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 20
  return Number(value)
}, z.number().int().min(1).max(50).default(20))

const importRowsSchema = z
  .array(z.record(z.string(), z.unknown()))
  .max(
    MAX_IMPORT_BATCH_ROWS,
    `За один пакет можно загрузить не больше ${MAX_IMPORT_BATCH_ROWS} строк`
  )
  .default([])

export const directoryMaterialsListQuerySchema = z.object({
  q: optionalTrimmedString(240),
  category: optionalTrimmedString(120),
  subcategory: optionalTrimmedString(120),
  unit: optionalTrimmedString(80),
  status: directoryMaterialStatusSchema,
  supplier: optionalTrimmedString(160),
  limit: directoryMaterialsLimitSchema,
  cursor: directoryMaterialsCursorSchema,
  sort: directoryMaterialsSortSchema,
})

export const directoryMaterialsCategoriesQuerySchema = z.object({
  status: directoryMaterialStatusSchema,
  category: optionalTrimmedString(120),
  subcategory: optionalTrimmedString(120),
})

export const directoryMaterialsExportQuerySchema =
  directoryMaterialsListQuerySchema.extend({
    format: z.enum(["csv"]).default("csv"),
    limit: directoryMaterialsExportLimitSchema,
    cursor: z.literal(0).default(0),
  })

export const directoryMaterialMutationSchema = z
  .object({
    name: requiredTrimmedString(240, "Название обязательно"),
    unit: requiredTrimmedString(80, "Единица измерения обязательна"),
    price: priceAmountSchema,
    category: requiredTrimmedString(120, "Категория обязательна"),
    subcategory: nullableTrimmedString(120),
    code: nullableTrimmedString(80),
    supplierName: nullableTrimmedString(160),
    imageUrl: nullableTrimmedString(1000),
    description: nullableTrimmedString(2000),
    aliases: stringListSchema,
    keywords: stringListSchema,
    sourceName: nullableTrimmedString(120),
    sourceExternalRowKey: nullableTrimmedString(160),
    currencyCode: currencyCodeSchema,
  })
  .strict()

export const directoryMaterialImportCreateSchema = z
  .object({
    rows: importRowsSchema,
    fileName: nullableTrimmedString(255),
    fileMimeType: nullableTrimmedString(120),
    fileSizeBytes: z.number().int().nonnegative().nullable().optional(),
    sourceName: nullableTrimmedString(120),
    options: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export const directoryMaterialImportBatchSchema = z
  .object({
    batchNumber: z.number().int().positive(),
    rowOffset: z.number().int().nonnegative(),
    rows: importRowsSchema,
    isLastBatch: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.isLastBatch || value.rows.length > 0, {
    message: "Пакет импорта материалов не содержит строк",
    path: ["rows"],
  })

export const directoryMaterialImportApplySchema = z
  .object({
    batchSize: z
      .preprocess((value) => {
        if (value === undefined || value === null || value === "") return 200
        return Number(value)
      }, z.number().int().min(1).max(MAX_IMPORT_APPLY_BATCH_ROWS))
      .default(200),
  })
  .strict()

export const directoryMaterialAiSearchSchema = z
  .object({
    query: requiredTrimmedString(240, "Поисковый запрос обязателен"),
    category: nullableTrimmedString(120),
    subcategory: nullableTrimmedString(120),
    unit: nullableTrimmedString(80),
    limit: directoryMaterialAiLimitSchema,
    threshold: directoryMaterialAiThresholdSchema,
  })
  .strict()

export const directoryMaterialEmbeddingProcessSchema = z
  .object({ limit: directoryMaterialEmbeddingLimitSchema })
  .strict()
export const directoryMaterialIdSchema = z.string().uuid()
export const directoryMaterialCategoryStatusSchema = z
  .enum(["active", "archived"])
  .default("active")

export function normalizeDirectoryMaterialsListParams(
  params: DirectoryMaterialsListParams
): Required<
  Pick<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort"> {
  return {
    ...params,
    status: params.status ?? "active",
    limit: params.limit ?? 50,
    cursor: params.cursor ?? 0,
    sort: params.sort ?? "relevance",
  }
}
export function normalizeDirectoryMaterialsCategoriesParams(
  params: DirectoryMaterialsCategoriesParams = {}
): Required<Pick<DirectoryMaterialsCategoriesParams, "status">> &
  Omit<DirectoryMaterialsCategoriesParams, "status"> {
  return { ...params, status: params.status ?? "active" }
}
export function parseDirectoryMaterialsListParams(
  searchParams: URLSearchParams
): Required<
  Pick<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort"> {
  return normalizeDirectoryMaterialsListParams(
    directoryMaterialsListQuerySchema.parse(Object.fromEntries(searchParams))
  )
}
export function parseDirectoryMaterialsCategoriesParams(
  searchParams: URLSearchParams
): Required<Pick<DirectoryMaterialsCategoriesParams, "status">> &
  Omit<DirectoryMaterialsCategoriesParams, "status"> {
  return normalizeDirectoryMaterialsCategoriesParams(
    directoryMaterialsCategoriesQuerySchema.parse(
      Object.fromEntries(searchParams)
    )
  )
}
export function parseDirectoryMaterialsExportParams(
  searchParams: URLSearchParams
) {
  const parsed = directoryMaterialsExportQuerySchema.parse(
    Object.fromEntries(searchParams)
  )
  const { format, ...params } = parsed
  return { format, params: normalizeDirectoryMaterialsListParams(params) }
}
export function parseDirectoryMaterialMutationBody(body: unknown) {
  return directoryMaterialMutationSchema.parse(body)
}
export function parseDirectoryMaterialImportCreateBody(body: unknown) {
  return directoryMaterialImportCreateSchema.parse(body)
}
export function parseDirectoryMaterialImportBatchBody(body: unknown) {
  return directoryMaterialImportBatchSchema.parse(body)
}
export function parseDirectoryMaterialImportApplyBody(body: unknown) {
  if (body === undefined || body === null)
    return directoryMaterialImportApplySchema.parse({})
  return directoryMaterialImportApplySchema.parse(body)
}
export function parseDirectoryMaterialAiSearchBody(body: unknown) {
  return directoryMaterialAiSearchSchema.parse(body)
}
export function parseDirectoryMaterialEmbeddingProcessBody(body: unknown) {
  return directoryMaterialEmbeddingProcessSchema.parse(body)
}
export function parseDirectoryMaterialId(id: string) {
  return directoryMaterialIdSchema.parse(id)
}
export function parseDirectoryMaterialCategoryStatus(value: string | null) {
  return directoryMaterialCategoryStatusSchema.parse(value ?? undefined)
}
