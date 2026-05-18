import { z } from "zod"
import type { DirectorySuppliersListParams } from "../types"

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

const directorySupplierStatusSchema = z.enum(["active", "archived"]).default("active")
const directorySupplierLegalStatusSchema = z.enum(["juridical", "individual"])
const directorySuppliersSortSchema = z.enum(["relevance", "updated_desc", "name_asc"]).default("relevance")
const directorySuppliersCursorSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 0
  return Number(value)
}, z.number().int().nonnegative().default(0))
const directorySuppliersLimitSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 50
  return Number(value)
}, z.number().int().min(1).max(100).default(50))

const colorSchema = z.preprocess((value) => {
  if (value === null) return null
  if (typeof value !== "string") return "#64748B"
  const trimmed = value.trim()
  return trimmed || "#64748B"
}, z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Цвет должен быть в формате HEX").nullable().optional())

export const directorySuppliersListQuerySchema = z.object({
  q: optionalTrimmedString(240),
  status: directorySupplierStatusSchema,
  limit: directorySuppliersLimitSchema,
  cursor: directorySuppliersCursorSchema,
  sort: directorySuppliersSortSchema,
})

export const directorySupplierMutationSchema = z.object({
  name: requiredTrimmedString(240, "Название поставщика обязательно"),
  legalStatus: directorySupplierLegalStatusSchema,
  color: colorSchema,
  inn: nullableTrimmedString(32),
  phone: nullableTrimmedString(64),
  email: nullableTrimmedString(160),
  address: nullableTrimmedString(500),
  notes: nullableTrimmedString(2000),
}).strict()

export const directorySupplierIdSchema = z.string().uuid()

export function normalizeDirectorySuppliersListParams(
  params: DirectorySuppliersListParams
): Required<Pick<DirectorySuppliersListParams, "status" | "limit" | "cursor" | "sort">> &
  Omit<DirectorySuppliersListParams, "status" | "limit" | "cursor" | "sort"> {
  return {
    ...params,
    status: params.status ?? "active",
    limit: params.limit ?? 50,
    cursor: params.cursor ?? 0,
    sort: params.sort ?? "relevance",
  }
}

export function parseDirectorySuppliersListParams(searchParams: URLSearchParams) {
  return normalizeDirectorySuppliersListParams(
    directorySuppliersListQuerySchema.parse(Object.fromEntries(searchParams))
  )
}

export function parseDirectorySupplierMutationBody(body: unknown) {
  return directorySupplierMutationSchema.parse(body)
}

export function parseDirectorySupplierId(id: string) {
  return directorySupplierIdSchema.parse(id)
}
