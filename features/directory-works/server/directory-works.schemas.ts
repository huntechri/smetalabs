import { z } from "zod"
import type { DirectoryWorksListParams } from "../types"
import { normalizeDirectoryWorksListParams } from "./directory-works.search"

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

const rateAmountSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() !== "") return Number(value)
  return value
}, z.number().finite().min(0, "Расценка не может быть отрицательной"))

const directoryWorkStatusSchema = z.enum(["active", "archived"]).default("active")
const directoryWorksSortSchema = z
  .enum(["relevance", "updated_desc", "title_asc"])
  .default("relevance")
const directoryWorkPriceKindSchema = z
  .enum(["base", "labor", "turnkey", "estimate", "custom"])
  .default("base")
const currencyCodeSchema = z
  .preprocess((value) => {
    if (typeof value !== "string") return "RUB"
    const normalized = value.trim().toUpperCase()
    return normalized || "RUB"
  }, z.string().regex(/^[A-Z]{3}$/, "Код валюты должен быть в ISO-формате"))
  .default("RUB")

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
  })
  .strict()

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

export function parseDirectoryWorkMutationBody(body: unknown) {
  return directoryWorkMutationSchema.parse(body)
}

export function parseDirectoryWorkId(id: string) {
  return directoryWorkIdSchema.parse(id)
}

export function parseDirectoryWorkCategoryStatus(value: string | null) {
  return directoryWorkCategoryStatusSchema.parse(value ?? undefined)
}
