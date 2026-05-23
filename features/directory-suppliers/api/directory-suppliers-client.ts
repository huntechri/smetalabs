import type {
  DirectorySupplier,
  DirectorySupplierMutationInput,
  DirectorySuppliersListParams,
  DirectorySuppliersListResponse,
} from "../types"
import { throwDirectorySuppliersApiError } from "./directory-suppliers-errors"

function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined
) {
  if (value === undefined || value === "") return
  params.set(key, String(value))
}

function buildListUrl(path: string, query: DirectorySuppliersListParams = {}) {
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

  if (!response.ok) await throwDirectorySuppliersApiError(response, resource)

  return response.json() as Promise<T>
}

export function fetchDirectorySuppliers(
  params: DirectorySuppliersListParams = {}
) {
  return fetchJson<DirectorySuppliersListResponse>(
    buildListUrl("/api/directory-suppliers", params),
    "справочника поставщиков"
  )
}

export async function fetchDirectorySupplier(id: string) {
  const json = await fetchJson<{ data: DirectorySupplier }>(
    `/api/directory-suppliers/${id}`,
    "поставщика"
  )
  return json.data
}

export function createDirectorySupplier(input: DirectorySupplierMutationInput) {
  return fetchJson<{ data: DirectorySupplier }>(
    "/api/directory-suppliers",
    "создания поставщика",
    { method: "POST", body: JSON.stringify(input) }
  )
}

export function updateDirectorySupplier({
  id,
  input,
}: {
  id: string
  input: DirectorySupplierMutationInput
}) {
  return fetchJson<{ data: DirectorySupplier }>(
    `/api/directory-suppliers/${id}`,
    "обновления поставщика",
    { method: "PATCH", body: JSON.stringify(input) }
  )
}

export function archiveDirectorySupplier(id: string) {
  return fetchJson<{ data: DirectorySupplier }>(
    `/api/directory-suppliers/${id}`,
    "архивирования поставщика",
    { method: "DELETE" }
  )
}
