import { z } from "zod"
import type {
  ProjectStatus,
  ProjectsListParams,
  ProjectsSort,
} from "@/types/project"

const PROJECT_STATUSES = ["new", "in_progress", "completed"] as const
const PROJECT_SORTS = ["relevance", "updated_desc", "title_asc"] as const

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

const projectMutationSchema = z.object({
  title: z
    .string({ error: "Название проекта обязательно" })
    .trim()
    .min(1, "Название проекта обязательно")
    .max(200, "Название проекта слишком длинное"),
  customerCounterpartyId: z
    .preprocess((value) => {
      if (value === "" || value === null || value === undefined) return null
      return value
    }, z.string().uuid("Выберите заказчика из списка").nullable())
    .optional(),
  address: nullableText(400),
  startDate: nullableText(20),
  endDate: nullableText(20),
  status: z.enum(PROJECT_STATUSES).default("new"),
})

const projectIdSchema = z.string().uuid("Некорректный идентификатор проекта")

function getStringParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim()
  return value || undefined
}

function getNumberParam(params: URLSearchParams, key: string) {
  const value = params.get(key)
  if (!value) return undefined

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

export function parseProjectsListParams(
  params: URLSearchParams
): ProjectsListParams {
  const status = params.get("status")
  const sort = params.get("sort")

  return {
    q: getStringParam(params, "q"),
    status:
      status === "all" || PROJECT_STATUSES.includes(status as ProjectStatus)
        ? (status as ProjectStatus | "all")
        : "all",
    limit: getNumberParam(params, "limit"),
    cursor: getNumberParam(params, "cursor"),
    sort: PROJECT_SORTS.includes(sort as ProjectsSort)
      ? (sort as ProjectsSort)
      : undefined,
  }
}

export function normalizeProjectsListParams(params: ProjectsListParams) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100)
  const cursor = Math.max(params.cursor ?? 0, 0)

  return {
    q: params.q?.trim() || undefined,
    status: params.status ?? "all",
    limit,
    cursor,
    sort: params.sort ?? "relevance",
  }
}

export function parseProjectMutationBody(body: unknown) {
  return projectMutationSchema.parse(body)
}

export function parseProjectId(id: string) {
  return projectIdSchema.parse(id)
}
