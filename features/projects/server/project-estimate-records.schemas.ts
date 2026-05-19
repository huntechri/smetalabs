import { z } from "zod"
import type { ProjectEstimateRecordsListParams } from "@/types/project-estimate-record"

const projectIdSchema = z.string().uuid("Некорректный идентификатор проекта")
const estimateRecordIdSchema = z.string().uuid("Некорректный идентификатор строки сметы")

const projectEstimateRecordMutationSchema = z.object({
  name: z
    .string({ error: "Название сметы обязательно" })
    .trim()
    .min(1, "Название сметы обязательно")
    .max(200, "Название сметы слишком длинное"),
})

function getNumberParam(params: URLSearchParams, key: string) {
  const value = params.get(key)
  if (!value) return undefined

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

export function parseProjectEstimateRecordsListParams(
  params: URLSearchParams
): ProjectEstimateRecordsListParams {
  return {
    limit: getNumberParam(params, "limit"),
    cursor: getNumberParam(params, "cursor"),
  }
}

export function normalizeProjectEstimateRecordsListParams(
  params: ProjectEstimateRecordsListParams
) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100)
  const cursor = Math.max(params.cursor ?? 0, 0)

  return { limit, cursor }
}

export function parseProjectEstimateRecordMutationBody(body: unknown) {
  return projectEstimateRecordMutationSchema.parse(body)
}

export function parseProjectId(id: string) {
  return projectIdSchema.parse(id)
}

export function parseEstimateRecordId(id: string) {
  return estimateRecordIdSchema.parse(id)
}
