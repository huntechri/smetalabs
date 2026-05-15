import type {
  DirectoryMaterial,
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

export function fetchDirectoryMaterials(
  params: DirectoryMaterialsListParams = {}
) {
  return fetchJson<DirectoryMaterialsListResponse>(
    buildListUrl("/api/directory-materials", params),
    "справочника материалов"
  )
}

export function searchDirectoryMaterials(
  params: DirectoryMaterialsListParams = {}
) {
  return fetchJson<DirectoryMaterialsListResponse>(
    buildListUrl("/api/directory-materials/search", {
      sort: "relevance",
      ...params,
    }),
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
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  )
}

export function fetchDirectoryMaterialsCategories() {
  return fetchJson<DirectoryMaterialsCategoriesResponse>(
    "/api/directory-materials/categories",
    "категорий материалов"
  )
}
