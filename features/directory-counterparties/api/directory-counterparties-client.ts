import type {
  DirectoryCounterpartiesListParams,
  DirectoryCounterpartiesListResponse,
  DirectoryCounterparty,
  DirectoryCounterpartyMutationInput,
} from "../types"
import { throwDirectoryCounterpartiesApiError } from "./directory-counterparties-errors"

function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined
) {
  if (value === undefined || value === "") return
  params.set(key, String(value))
}

function buildListUrl(
  path: string,
  query: DirectoryCounterpartiesListParams = {}
) {
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

  if (!response.ok)
    await throwDirectoryCounterpartiesApiError(response, resource)

  return response.json() as Promise<T>
}

export function fetchDirectoryCounterparties(
  params: DirectoryCounterpartiesListParams = {}
) {
  return fetchJson<DirectoryCounterpartiesListResponse>(
    buildListUrl("/api/directory-counterparties", params),
    "справочника контрагентов"
  )
}

export async function fetchDirectoryCounterparty(id: string) {
  const json = await fetchJson<{ data: DirectoryCounterparty }>(
    `/api/directory-counterparties/${id}`,
    "контрагента"
  )
  return json.data
}

export function createDirectoryCounterparty(
  input: DirectoryCounterpartyMutationInput
) {
  return fetchJson<{ data: DirectoryCounterparty }>(
    "/api/directory-counterparties",
    "создания контрагента",
    { method: "POST", body: JSON.stringify(input) }
  )
}

export function updateDirectoryCounterparty({
  id,
  input,
}: {
  id: string
  input: DirectoryCounterpartyMutationInput
}) {
  return fetchJson<{ data: DirectoryCounterparty }>(
    `/api/directory-counterparties/${id}`,
    "обновления контрагента",
    { method: "PATCH", body: JSON.stringify(input) }
  )
}

export function archiveDirectoryCounterparty(id: string) {
  return fetchJson<{ data: DirectoryCounterparty }>(
    `/api/directory-counterparties/${id}`,
    "архивирования контрагента",
    { method: "DELETE" }
  )
}
