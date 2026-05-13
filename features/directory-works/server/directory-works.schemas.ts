import { z } from "zod"
import type { DirectoryWorksListParams } from "../types"
import { normalizeDirectoryWorksListParams } from "./directory-works.search"

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined
    const trimmed = value.trim().replace(/\s+/g, " ")
    return trimmed.length > 0 ? trimmed : undefined
  }, z.string().max(maxLength).optional())

const directoryWorkStatusSchema = z.enum(["active", "archived"]).default("active")
const directoryWorksSortSchema = z
  .enum(["relevance", "updated_desc", "title_asc"])
  .default("relevance")

const directoryWorksCursorSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 0
  return Number(value)
}, z.number().int().nonnegative().default(0))

const directoryWorksLimitSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 50
  return Number(value)
}, z.number().int().min(1).max(100).default(50))

export const directoryWorksListQuerySchema = z.object({
  q: optionalTrimmedString(240),
  category: optionalTrimmedString(120),
  subcategory: optionalTrimmedString(120),
  unit: optionalTrimmedString(80),
  status: directoryWorkStatusSchema,
  limit: directoryWorksLimitSchema,
  cursor: directoryWorksCursorSchema,
  sort: directoryWorksSortSchema,
})

export const directoryWorkIdSchema = z.string().uuid()
export const directoryWorkCategoryStatusSchema = z
  .enum(["active", "archived"])
  .default("active")

export function parseDirectoryWorksListParams(
  searchParams: URLSearchParams
): Required<Pick<DirectoryWorksListParams, "status" | "limit" | "cursor" | "sort">> &
  Omit<DirectoryWorksListParams, "status" | "limit" | "cursor" | "sort"> {
  return normalizeDirectoryWorksListParams(
    directoryWorksListQuerySchema.parse(Object.fromEntries(searchParams))
  )
}

export function parseDirectoryWorkId(id: string) {
  return directoryWorkIdSchema.parse(id)
}

export function parseDirectoryWorkCategoryStatus(value: string | null) {
  return directoryWorkCategoryStatusSchema.parse(value ?? undefined)
}
