import type {
  DirectoryWork,
  DirectoryWorkAiSearchInput,
  DirectoryWorkAiSearchResponse,
  DirectoryWorkEmbeddingProcessResponse,
  DirectoryWorkImportApplyInput,
  DirectoryWorkImportApplyResponse,
  DirectoryWorkImportBatchInput,
  DirectoryWorkImportCreateInput,
  DirectoryWorkImportPreviewResponse,
  DirectoryWorkMutationInput,
  DirectoryWorksCategoriesResponse,
  DirectoryWorksExportFormat,
  DirectoryWorksListParams,
  DirectoryWorksListResponse,
} from "../model/directory-works-model"
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
  if (query.recommend) {
    appendParam(params, "recommend", "true")
  }

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

export function aiSearchDirectoryWorks(input: DirectoryWorkAiSearchInput) {
  return fetchJson<DirectoryWorkAiSearchResponse>(
    "/api/directory-works/ai-search",
    "AI-поиска работ",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
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

export function createDirectoryWorkImportJob(
  input: DirectoryWorkImportCreateInput
) {
  return fetchJson<DirectoryWorkImportPreviewResponse>(
    "/api/directory-works/import-jobs",
    "импорта работ",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  )
}

export function appendDirectoryWorkImportBatch({
  id,
  input,
}: {
  id: string
  input: DirectoryWorkImportBatchInput
}) {
  return fetchJson<DirectoryWorkImportPreviewResponse>(
    `/api/directory-works/import-jobs/${id}/batches`,
    "загрузки пакета работ",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  )
}

export function fetchDirectoryWorkImportJob(id: string) {
  return fetchJson<DirectoryWorkImportPreviewResponse>(
    `/api/directory-works/import-jobs/${id}`,
    "статуса импорта работ"
  )
}

export function applyDirectoryWorkImportJob({
  id,
  input,
}: {
  id: string
  input?: DirectoryWorkImportApplyInput
}) {
  return fetchJson<DirectoryWorkImportApplyResponse>(
    `/api/directory-works/import-jobs/${id}/apply`,
    "применения импорта работ",
    {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    }
  )
}

export function processDirectoryWorkEmbeddings(limit = 20) {
  return fetchJson<DirectoryWorkEmbeddingProcessResponse>(
    "/api/directory-works/embeddings/process",
    "генерации embeddings работ",
    {
      method: "POST",
      body: JSON.stringify({ limit }),
    }
  )
}

export function buildDirectoryWorksExportHref(
  format: DirectoryWorksExportFormat,
  params: DirectoryWorksListParams = {}
) {
  const url = buildListUrl("/api/directory-works/export", {
    ...params,
    status: params.status ?? "active",
    limit: undefined,
    cursor: undefined,
  })
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}format=${format}`
}

export function fetchDirectoryWorksCategories() {
  return fetchJson<DirectoryWorksCategoriesResponse>(
    "/api/directory-works/categories",
    "категорий работ"
  )
}
