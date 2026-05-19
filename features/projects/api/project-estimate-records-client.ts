import type {
  ProjectEstimateRecordMutationInput,
  ProjectEstimateRecordRow,
  ProjectEstimateRecordsListParams,
  ProjectEstimateRecordsListResponse,
} from "@/types/project-estimate-record"
import { throwProjectsApiError } from "./projects-errors"

function appendParam(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value === undefined || value === "") return
  params.set(key, String(value))
}

function buildListUrl(projectId: string, query: ProjectEstimateRecordsListParams = {}) {
  const params = new URLSearchParams()

  appendParam(params, "limit", query.limit)
  appendParam(params, "cursor", query.cursor)

  const search = params.toString()
  const path = `/api/projects/${projectId}/estimate-records`
  return search ? `${path}?${search}` : path
}

async function fetchJson<T>(url: string, resource: string, init?: RequestInit) {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  })

  if (!response.ok) await throwProjectsApiError(response, resource)

  return response.json() as Promise<T>
}

export function fetchProjectEstimateRecords({
  projectId,
  params,
}: {
  projectId: string
  params?: ProjectEstimateRecordsListParams
}) {
  return fetchJson<ProjectEstimateRecordsListResponse>(
    buildListUrl(projectId, params),
    "списка смет проекта"
  )
}

export function createProjectEstimateRecord({
  projectId,
  input,
}: {
  projectId: string
  input: ProjectEstimateRecordMutationInput
}) {
  return fetchJson<{ data: ProjectEstimateRecordRow }>(
    `/api/projects/${projectId}/estimate-records`,
    "создания сметы",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  )
}

export function updateProjectEstimateRecord({
  projectId,
  recordId,
  input,
}: {
  projectId: string
  recordId: string
  input: ProjectEstimateRecordMutationInput
}) {
  return fetchJson<{ data: ProjectEstimateRecordRow }>(
    `/api/projects/${projectId}/estimate-records/${recordId}`,
    "обновления сметы",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  )
}
