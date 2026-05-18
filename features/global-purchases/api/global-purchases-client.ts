import type {
  GlobalPurchaseMutationInput,
  GlobalPurchaseRow,
  GlobalPurchasesListParams,
  GlobalPurchasesListResponse,
} from "@/types/global-purchases"
import { throwGlobalPurchasesApiError } from "./global-purchases-errors"

function appendParam(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value === undefined || value === "") return
  params.set(key, String(value))
}

function buildListUrl(path: string, query: GlobalPurchasesListParams = {}) {
  const params = new URLSearchParams()

  appendParam(params, "q", query.q)
  appendParam(params, "status", query.status)
  appendParam(params, "projectId", query.projectId)
  appendParam(params, "dateFrom", query.dateFrom)
  appendParam(params, "dateTo", query.dateTo)
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

  if (!response.ok) await throwGlobalPurchasesApiError(response, resource)

  return response.json() as Promise<T>
}

export function fetchGlobalPurchases(params: GlobalPurchasesListParams = {}) {
  return fetchJson<GlobalPurchasesListResponse>(
    buildListUrl("/api/global-purchases", params),
    "список закупок"
  )
}

export async function fetchGlobalPurchase(id: string) {
  const json = await fetchJson<{ data: GlobalPurchaseRow }>(
    `/api/global-purchases/${id}`,
    "закупку"
  )
  return json.data
}

export function createGlobalPurchase(input: GlobalPurchaseMutationInput) {
  return fetchJson<{ data: GlobalPurchaseRow }>(
    "/api/global-purchases",
    "создание закупки",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  )
}

export function updateGlobalPurchase({
  id,
  input,
}: {
  id: string
  input: GlobalPurchaseMutationInput
}) {
  return fetchJson<{ data: GlobalPurchaseRow }>(
    `/api/global-purchases/${id}`,
    "изменение закупки",
    { method: "PATCH", body: JSON.stringify(input) }
  )
}

export function archiveGlobalPurchase(id: string) {
  return fetchJson<{ data: GlobalPurchaseRow }>(
    `/api/global-purchases/${id}`,
    "архивирование закупки",
    { method: "DELETE" }
  )
}
