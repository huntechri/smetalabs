import { z } from "zod"
import type {
  GlobalPurchaseStatus,
  GlobalPurchasesListParams,
  GlobalPurchasesSort,
} from "@/types/global-purchases"

const GLOBAL_PURCHASE_STATUSES = [
  "planned",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
] as const
const GLOBAL_PURCHASE_SORTS = ["relevance", "updated_desc", "title_asc", "project_asc"] as const

function getTodayIsoDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function nullableText(maxLength: number) {
  return z
    .preprocess((value) => {
      if (value === null || value === undefined) return null
      if (typeof value !== "string") return value
      const trimmed = value.trim().replace(/\s+/g, " ")
      return trimmed || null
    }, z.string().max(maxLength).nullable())
    .optional()
}

function nullableUuid(message: string) {
  return z
    .preprocess((value) => {
      if (value === "" || value === null || value === undefined) return null
      return value
    }, z.string().uuid(message).nullable())
    .optional()
}

function nonNegativeNumber(message: string) {
  return z.coerce.number({ error: message }).finite(message).min(0, message)
}

function nullableNonNegativeNumber(message: string) {
  return z
    .preprocess((value) => {
      if (value === "" || value === null || value === undefined) return null
      return value
    }, z.coerce.number({ error: message }).finite(message).min(0, message).nullable())
    .optional()
}

const globalPurchaseMutationSchema = z.object({
  title: z
    .string({ error: "Название закупки обязательно" })
    .trim()
    .min(1, "Название закупки обязательно")
    .max(240, "Название закупки слишком длинное"),
  unit: z
    .string({ error: "Единица измерения обязательна" })
    .trim()
    .min(1, "Единица измерения обязательна")
    .max(80, "Единица измерения слишком длинная"),
  planQuantity: nonNegativeNumber("Плановое количество должно быть неотрицательным числом"),
  planPrice: nonNegativeNumber("Плановая цена должна быть неотрицательным числом"),
  factQuantity: nullableNonNegativeNumber("Фактическое количество должно быть неотрицательным числом"),
  factPrice: nullableNonNegativeNumber("Фактическая цена должна быть неотрицательным числом"),
  supplierId: nullableUuid("Некорректный поставщик"),
  projectId: nullableUuid("Некорректный объект"),
  purchaseDate: nullableText(30),
  status: z.enum(GLOBAL_PURCHASE_STATUSES).default("planned"),
  notes: nullableText(1000),
})

const globalPurchaseIdSchema = z.string().uuid("Некорректный идентификатор закупки")

function getStringParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim()
  return value || undefined
}

function getDateParam(params: URLSearchParams, key: string) {
  return getStringParam(params, key) ?? getTodayIsoDate()
}

function getNumberParam(params: URLSearchParams, key: string) {
  const value = params.get(key)
  if (!value) return undefined

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

export function parseGlobalPurchasesListParams(params: URLSearchParams): GlobalPurchasesListParams {
  const status = params.get("status")
  const sort = params.get("sort")

  return {
    q: getStringParam(params, "q"),
    status:
      status === "all" || GLOBAL_PURCHASE_STATUSES.includes(status as GlobalPurchaseStatus)
        ? (status as GlobalPurchaseStatus | "all")
        : "all",
    projectId: getStringParam(params, "projectId"),
    dateFrom: getDateParam(params, "dateFrom"),
    dateTo: getDateParam(params, "dateTo"),
    limit: getNumberParam(params, "limit"),
    cursor: getNumberParam(params, "cursor"),
    sort: GLOBAL_PURCHASE_SORTS.includes(sort as GlobalPurchasesSort)
      ? (sort as GlobalPurchasesSort)
      : undefined,
  }
}

export function normalizeGlobalPurchasesListParams(params: GlobalPurchasesListParams) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100)
  const cursor = Math.max(params.cursor ?? 0, 0)

  return {
    q: params.q?.trim() || undefined,
    status: params.status ?? "all",
    projectId: params.projectId?.trim() || undefined,
    dateFrom: params.dateFrom?.trim() || getTodayIsoDate(),
    dateTo: params.dateTo?.trim() || getTodayIsoDate(),
    limit,
    cursor,
    sort: params.sort ?? "project_asc",
  }
}

export function parseGlobalPurchaseMutationBody(body: unknown) {
  return globalPurchaseMutationSchema.parse(body)
}

export function parseGlobalPurchaseId(id: string) {
  return globalPurchaseIdSchema.parse(id)
}
