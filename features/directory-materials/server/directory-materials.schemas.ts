import { z } from "zod"
import type { DirectoryMaterialsListParams } from "../types"

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined
    const trimmed = value.trim().replace(/\s+/g, " ")
    return trimmed.length > 0 ? trimmed : undefined
  }, z.string().max(maxLength).optional())

const directoryMaterialStatusSchema = z.enum(["active", "archived"]).default("active")
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

export const directoryMaterialIdSchema = z.string().uuid()
export const directoryMaterialCategoryStatusSchema = z
  .enum(["active", "archived"])
  .default("active")

export function normalizeDirectoryMaterialsListParams(
  params: DirectoryMaterialsListParams
): Required<Pick<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort">> &
  Omit<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort"> {
  return {
    ...params,
    status: params.status ?? "active",
    limit: params.limit ?? 50,
    cursor: params.cursor ?? 0,
    sort: params.sort ?? "relevance",
  }
}

export function parseDirectoryMaterialsListParams(
  searchParams: URLSearchParams
): Required<Pick<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort">> &
  Omit<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort"> {
  return normalizeDirectoryMaterialsListParams(
    directoryMaterialsListQuerySchema.parse(Object.fromEntries(searchParams))
  )
}

export function parseDirectoryMaterialId(id: string) {
  return directoryMaterialIdSchema.parse(id)
}

export function parseDirectoryMaterialCategoryStatus(value: string | null) {
  return directoryMaterialCategoryStatusSchema.parse(value ?? undefined)
}
