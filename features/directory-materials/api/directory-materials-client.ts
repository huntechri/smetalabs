import type {
  DirectoryMaterial,
  DirectoryMaterialImportApplyInput,
  DirectoryMaterialImportApplyResponse,
  DirectoryMaterialImportBatchInput,
  DirectoryMaterialImportCreateInput,
  DirectoryMaterialImportPreviewResponse,
  DirectoryMaterialMutationInput,
  DirectoryMaterialsCategoriesResponse,
  DirectoryMaterialsListParams,
  DirectoryMaterialsListResponse,
} from "../types"
import { throwDirectoryMaterialsApiError } from "./directory-materials-errors"

function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined
) {
  if (value === undefined || value === "") return
  params.set(key, String(value))
}

function buildListUrl(path: string, query: DirectoryMaterialsListParams = {}) {
  const params = new URLSearchParams()

  appendParam(params, "q", query.q)
  appendParam(params, "category", query.category)
  appendParam(params, "subcategory", query.subcategory)
  appendParam(params, "unit", query.unit)
  appendParam(params, "status", query.status)
  appendParam(params, "supplier", query.supplier)
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

  if (!response.ok) await throwDirectoryMaterialsApiError(response, resource)

  return response.json() as Promise<T>
}

export function fetchDirectoryMaterials(params: DirectoryMaterialsListParams = {}) {
  return fetchJson<DirectoryMaterialsListResponse>(
    buildListUrl("/api/directory-materials", params),
    "справочника материалов"
  )
}

export function searchDirectoryMaterials(params: DirectoryMaterialsListParams = {}) {
  return fetchJson<DirectoryMaterialsListResponse>(
    buildListUrl("/api/directory-materials/search", { sort: "relevance", ...params }),
    "поиска материалов"
  )
}

export async function fetchDirectoryMaterial(id: string) {
  const json = await fetchJson<{ data: DirectoryMaterial }>(
    `/api/directory-materials/${id}`,
    "материала"
  )
  return json.data
}

export function createDirectoryMaterial(input: DirectoryMaterialMutationInput) {
  return fetchJson<{ data: DirectoryMaterial }>(
    "/api/directory-materials",
    "создания материала",
    { method: "POST", body: JSON.stringify(input) }
  )
}

export function updateDirectoryMaterial({
  id,
  input,
}: {
  id: string
  input: DirectoryMaterialMutationInput
}) {
  return fetchJson<{ data: DirectoryMaterial }>(
    `/api/directory-materials/${id}`,
    "обновления материала",
    { method: "PATCH", body: JSON.stringify(input) }
  )
}

export function archiveDirectoryMaterial(id: string) {
  return fetchJson<{ data: DirectoryMaterial }>(
    `/api/directory-materials/${id}`,
    "архивирования материала",
    { method: "DELETE" }
  )
}

export function createDirectoryMaterialImportJob(input: DirectoryMaterialImportCreateInput) {
  return fetchJson<DirectoryMaterialImportPreviewResponse>(
    "/api/directory-materials/import-jobs",
    "импорта материалов",
    { method: "POST", body: JSON.stringify(input) }
  )
}

export function appendDirectoryMaterialImportBatch({
  id,
  input,
}: {
  id: string
  input: DirectoryMaterialImportBatchInput
}) {
  return fetchJson<DirectoryMaterialImportPreviewResponse>(
    `/api/directory-materials/import-jobs/${id}/batches`,
    "загрузки пакета материалов",
    { method: "POST", body: JSON.stringify(input) }
  )
}

export function fetchDirectoryMaterialImportJob(id: string) {
  return fetchJson<DirectoryMaterialImportPreviewResponse>(
    `/api/directory-materials/import-jobs/${id}`,
    "статуса импорта материалов"
  )
}

export function applyDirectoryMaterialImportJob({
  id,
  input,
}: {
  id: string
  input?: DirectoryMaterialImportApplyInput
}) {
  return fetchJson<DirectoryMaterialImportApplyResponse>(
    `/api/directory-materials/import-jobs/${id}/apply`,
    "применения импорта материалов",
    { method: "POST", body: JSON.stringify(input ?? {}) }
  )
}

export function fetchDirectoryMaterialsCategories() {
  return fetchJson<DirectoryMaterialsCategoriesResponse>(
    "/api/directory-materials/categories",
    "категорий материалов"
  )
}
