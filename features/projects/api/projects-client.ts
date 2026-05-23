import type {
  ProjectMutationInput,
  ProjectRow,
  ProjectsListParams,
  ProjectsListResponse,
} from "@/types/project"
import { throwProjectsApiError } from "./projects-errors"

function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined
) {
  if (value === undefined || value === "") return
  params.set(key, String(value))
}

function buildListUrl(path: string, query: ProjectsListParams = {}) {
  const params = new URLSearchParams()

  appendParam(params, "q", query.q)
  appendParam(params, "status", query.status)
  appendParam(params, "limit", query.limit)
  appendParam(params, "cursor", query.cursor)
  appendParam(params, "sort", query.sort)

  const search = params.toString()
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

export function fetchProjects(params: ProjectsListParams = {}) {
  return fetchJson<ProjectsListResponse>(
    buildListUrl("/api/projects", params),
    "списка проектов"
  )
}

export async function fetchProject(id: string) {
  const json = await fetchJson<{ data: ProjectRow }>(
    `/api/projects/${id}`,
    "проекта"
  )
  return json.data
}

export function createProject(input: ProjectMutationInput) {
  return fetchJson<{ data: ProjectRow }>("/api/projects", "создания проекта", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateProject({
  id,
  input,
}: {
  id: string
  input: ProjectMutationInput
}) {
  return fetchJson<{ data: ProjectRow }>(
    `/api/projects/${id}`,
    "обновления проекта",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  )
}

export function archiveProject(id: string) {
  return fetchJson<{ data: ProjectRow }>(
    `/api/projects/${id}`,
    "архивирования проекта",
    {
      method: "DELETE",
    }
  )
}
