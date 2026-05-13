import type {
  DirectoryWork,
  DirectoryWorkMutationInput,
  DirectoryWorksCategoriesResponse,
  DirectoryWorksListParams,
  DirectoryWorksListResponse,
} from "../types"
import { throwDirectoryWorksApiError } from "./directory-works-errors"

function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined
) {
  if (value === undefined || value === "") return
  params.set(key, String(value))
}

function buildListUrl(path: string, query: DirectoryWorksListParams = {}) {
  const params = new URLSearchParams()

  appendParam(params, "q", query.q)
  appendParam(params, "category", query.category)
  appendParam(params, "subcategory", query.subcategory)
  appendParam(params, "unit", query.unit)
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

  if (!response.ok) await throwDirectoryWorksApiError(response, resource)

  return response.json() as Promise<T>
}

export function fetchDirectoryWorks(params: DirectoryWorksListParams = {}) {
  return fetchJson<DirectoryWorksListResponse>(
    buildListUrl("/api/directory-works", params),
    "справочника работ"
  )
}

export function searchDirectoryWorks(params: DirectoryWorksListParams = {}) {
  return fetchJson<DirectoryWorksListResponse>(
    buildListUrl("/api/directory-works/search", {
      sort: "relevance",
      ...params,
    }),
    "поиска работ"
  )
}

export async function fetchDirectoryWork(id: string) {
  const json = await fetchJson<{ data: DirectoryWork }>(
    `/api/directory-works/${id}`,
    "работы"
  )
  return json.data
}

export function createDirectoryWork(input: DirectoryWorkMutationInput) {
  return fetchJson<{ data: DirectoryWork }>(
    "/api/directory-works",
    "создания работы",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  )
}

export function updateDirectoryWork({
  id,
  input,
}: {
  id: string
  input: DirectoryWorkMutationInput
}) {
  return fetchJson<{ data: DirectoryWork }>(
    `/api/directory-works/${id}`,
    "обновления работы",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  )
}

export function archiveDirectoryWork(id: string) {
  return fetchJson<{ data: DirectoryWork }>(
    `/api/directory-works/${id}`,
    "архивации работы",
    {
      method: "DELETE",
    }
  )
}

export function fetchDirectoryWorksCategories() {
  return fetchJson<DirectoryWorksCategoriesResponse>(
    "/api/directory-works/categories",
    "категорий работ"
  )
}
