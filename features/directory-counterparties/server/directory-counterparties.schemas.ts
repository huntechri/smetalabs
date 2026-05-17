import { z } from "zod"
import type { DirectoryCounterpartiesListParams } from "../types"

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

const directoryCounterpartyStatusSchema = z.enum(["active", "archived"]).default("active")
const directoryCounterpartiesSortSchema = z.enum(["relevance", "updated_desc", "name_asc"]).default("relevance")
const directoryCounterpartiesCursorSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 0
  return Number(value)
}, z.number().int().nonnegative().default(0))
const directoryCounterpartiesLimitSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 50
  return Number(value)
}, z.number().int().min(1).max(100).default(50))

export const directoryCounterpartiesListQuerySchema = z.object({
  q: optionalTrimmedString(240),
  status: directoryCounterpartyStatusSchema,
  limit: directoryCounterpartiesLimitSchema,
  cursor: directoryCounterpartiesCursorSchema,
  sort: directoryCounterpartiesSortSchema,
})

export const directoryCounterpartyMutationSchema = z.object({
  name: requiredTrimmedString(240, "Название или ФИО обязательно"),
  type: z.enum(["customer", "contractor"]),
  legalStatus: z.enum(["juridical", "individual"]),
  inn: nullableTrimmedString(20),
  phone: nullableTrimmedString(40),
  legalAddress: nullableTrimmedString(500),
  bankName: nullableTrimmedString(240),
  bik: nullableTrimmedString(20),
  corrAccount: nullableTrimmedString(40),
  accountNumber: nullableTrimmedString(40),
  passportSeries: nullableTrimmedString(20),
  passportNumber: nullableTrimmedString(20),
  passportIssuedBy: nullableTrimmedString(500),
  passportIssueDate: nullableTrimmedString(20),
  passportDepartmentCode: nullableTrimmedString(20),
  registrationAddress: nullableTrimmedString(500),
}).strict()

export const directoryCounterpartyIdSchema = z.string().uuid()

export function normalizeDirectoryCounterpartiesListParams(params: DirectoryCounterpartiesListParams): Required<Pick<DirectoryCounterpartiesListParams, "status" | "limit" | "cursor" | "sort">> & Omit<DirectoryCounterpartiesListParams, "status" | "limit" | "cursor" | "sort"> {
  return { ...params, status: params.status ?? "active", limit: params.limit ?? 50, cursor: params.cursor ?? 0, sort: params.sort ?? "relevance" }
}

export function parseDirectoryCounterpartiesListParams(searchParams: URLSearchParams): Required<Pick<DirectoryCounterpartiesListParams, "status" | "limit" | "cursor" | "sort">> & Omit<DirectoryCounterpartiesListParams, "status" | "limit" | "cursor" | "sort"> {
  return normalizeDirectoryCounterpartiesListParams(directoryCounterpartiesListQuerySchema.parse(Object.fromEntries(searchParams)))
}

export function parseDirectoryCounterpartyMutationBody(body: unknown) { return directoryCounterpartyMutationSchema.parse(body) }
export function parseDirectoryCounterpartyId(id: string) { return directoryCounterpartyIdSchema.parse(id) }
