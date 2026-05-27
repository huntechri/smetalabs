"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query"
import {
  archiveGlobalPurchase,
  createGlobalPurchase,
  fetchGlobalPurchases,
  updateGlobalPurchase,
} from "@/features/global-purchases/api/global-purchases-client"
import { globalPurchasesQueryKeys } from "@/features/global-purchases/api/global-purchases-query-keys"
import type {
  GlobalPurchaseMutationInput,
  GlobalPurchaseRow,
  GlobalPurchasesListParams,
  GlobalPurchasesListResponse,
  GlobalPurchasesSort,
  GlobalPurchasesStatusFilter,
} from "@/types/global-purchases"

type ReadonlySearchParams = {
  get: (name: string) => string | null
}

const GLOBAL_PURCHASES_STALE_TIME_MS = 30_000
const GLOBAL_PURCHASES_GC_TIME_MS = 5 * 60_000

function getTodayIsoDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getStringParam(searchParams: ReadonlySearchParams, key: string) {
  const value = searchParams.get(key)?.trim()
  return value || undefined
}

function getDateParam(searchParams: ReadonlySearchParams, key: string) {
  return getStringParam(searchParams, key) ?? getTodayIsoDate()
}

function getNumberParam(searchParams: ReadonlySearchParams, key: string) {
  const value = searchParams.get(key)
  if (!value) return undefined

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

function getStatusParam(
  searchParams: ReadonlySearchParams
): GlobalPurchasesStatusFilter {
  const status = searchParams.get("status")
  if (
    status === "planned" ||
    status === "ordered" ||
    status === "partially_received" ||
    status === "received" ||
    status === "cancelled"
  ) {
    return status
  }
  return "all"
}

function getSortParam(
  searchParams: ReadonlySearchParams
): GlobalPurchasesSort | undefined {
  const sort = searchParams.get("sort")
  if (
    sort === "relevance" ||
    sort === "updated_desc" ||
    sort === "title_asc" ||
    sort === "project_asc"
  )
    return sort
  return undefined
}

function getListParams(
  searchParams: ReadonlySearchParams
): GlobalPurchasesListParams {
  return {
    q: getStringParam(searchParams, "q"),
    status: getStatusParam(searchParams),
    projectId: getStringParam(searchParams, "projectId"),
    dateFrom: getDateParam(searchParams, "dateFrom"),
    dateTo: getDateParam(searchParams, "dateTo"),
    limit: getNumberParam(searchParams, "limit") ?? 50,
    cursor: getNumberParam(searchParams, "cursor") ?? 0,
    sort: getSortParam(searchParams) ?? "project_asc",
  }
}

function compareText(
  a: string | null | undefined,
  b: string | null | undefined
) {
  return (a || "~~~").localeCompare(b || "~~~", "ru")
}

function compareDate(
  a: string | null | undefined,
  b: string | null | undefined
) {
  return (a || "9999-12-31").localeCompare(b || "9999-12-31")
}

function sortRows(
  rows: GlobalPurchaseRow[],
  sort: GlobalPurchasesSort | undefined
) {
  return [...rows].sort((a, b) => {
    if (sort === "title_asc")
      return compareText(a.title, b.title) || a.id.localeCompare(b.id)
    if (sort === "updated_desc")
      return (
        b.metadata.updatedAt.localeCompare(a.metadata.updatedAt) ||
        a.id.localeCompare(b.id)
      )

    return (
      compareText(a.projectTitle, b.projectTitle) ||
      compareDate(a.purchaseDate, b.purchaseDate) ||
      compareText(a.title, b.title) ||
      a.id.localeCompare(b.id)
    )
  })
}

function getSearchText(row: GlobalPurchaseRow) {
  return [row.title, row.unit, row.supplierName, row.projectTitle, row.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function matchesParams(
  row: GlobalPurchaseRow,
  params: GlobalPurchasesListParams
) {
  if (params.status && params.status !== "all" && row.status !== params.status)
    return false
  if (params.projectId && row.projectId !== params.projectId) return false
  if (
    params.dateFrom &&
    (!row.purchaseDate || row.purchaseDate < params.dateFrom)
  )
    return false
  if (params.dateTo && (!row.purchaseDate || row.purchaseDate > params.dateTo))
    return false

  const q = params.q?.trim().toLowerCase()
  if (!q) return true

  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => getSearchText(row).includes(token))
}

function updateCachedLists(
  queryClient: QueryClient,
  updater: (
    current: GlobalPurchasesListResponse,
    params: GlobalPurchasesListParams
  ) => GlobalPurchasesListResponse
) {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: globalPurchasesQueryKeys.all })

  for (const query of queries) {
    const queryKey = query.queryKey as QueryKey
    if (queryKey[1] !== "list") continue

    const listParams = (queryKey[2] ?? {}) as GlobalPurchasesListParams
    queryClient.setQueryData<GlobalPurchasesListResponse>(
      queryKey,
      (current) => (current ? updater(current, listParams) : current)
    )
  }
}

function replaceRowInCachedLists(
  queryClient: QueryClient,
  row: GlobalPurchaseRow
) {
  queryClient.setQueryData(globalPurchasesQueryKeys.detail(row.id), row)
  updateCachedLists(queryClient, (current, listParams) => {
    const existed = current.data.some((item) => item.id === row.id)
    if (!existed) return current

    const nextRows = current.data.filter((item) => item.id !== row.id)
    const matches = matchesParams(row, listParams)
    const nextData = matches
      ? sortRows([...nextRows, row], listParams.sort).slice(
          0,
          current.meta.limit
        )
      : nextRows

    return {
      ...current,
      data: nextData,
      meta: {
        ...current.meta,
        total: current.meta.total - (matches ? 0 : 1),
      },
    }
  })
}

function insertRowIntoCurrentList(
  queryClient: QueryClient,
  params: GlobalPurchasesListParams,
  row: GlobalPurchaseRow
) {
  queryClient.setQueryData(globalPurchasesQueryKeys.detail(row.id), row)
  queryClient.setQueryData<GlobalPurchasesListResponse>(
    globalPurchasesQueryKeys.list(params),
    (current) => {
      if (!current || !matchesParams(row, params)) return current

      const rowsWithoutDuplicate = current.data.filter(
        (item) => item.id !== row.id
      )
      const nextData = sortRows(
        [...rowsWithoutDuplicate, row],
        params.sort
      ).slice(0, current.meta.limit)

      return {
        ...current,
        data: nextData,
        meta: {
          ...current.meta,
          total:
            current.meta.total +
            (current.data.some((item) => item.id === row.id) ? 0 : 1),
        },
      }
    }
  )
}

function removeRowFromCachedLists(
  queryClient: QueryClient,
  row: GlobalPurchaseRow
) {
  queryClient.removeQueries({
    queryKey: globalPurchasesQueryKeys.detail(row.id),
    exact: true,
  })
  updateCachedLists(queryClient, (current) => {
    const existed = current.data.some((item) => item.id === row.id)
    if (!existed) return current

    return {
      ...current,
      data: current.data.filter((item) => item.id !== row.id),
      meta: {
        ...current.meta,
        total: Math.max(current.meta.total - 1, 0),
      },
    }
  })
}

export function useGlobalPurchases() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useMemo(() => getListParams(searchParams), [searchParams])

  const purchasesQuery = useQuery({
    queryKey: globalPurchasesQueryKeys.list(params),
    queryFn: () => fetchGlobalPurchases(params),
    staleTime: GLOBAL_PURCHASES_STALE_TIME_MS,
    gcTime: GLOBAL_PURCHASES_GC_TIME_MS,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  })

  const updateUrlParams = (next: Partial<GlobalPurchasesListParams>) => {
    const urlParams = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || value === "all") {
        urlParams.delete(key)
      } else {
        urlParams.set(key, String(value))
      }
    }

    if (
      "q" in next ||
      "status" in next ||
      "projectId" in next ||
      "dateFrom" in next ||
      "dateTo" in next ||
      "sort" in next
    ) {
      urlParams.delete("cursor")
    }

    const query = urlParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const createMutation = useMutation({
    mutationFn: createGlobalPurchase,
    onSuccess: (response) => {
      insertRowIntoCurrentList(queryClient, params, response.data)
      queryClient.invalidateQueries({ queryKey: ["estimatePurchases"] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateGlobalPurchase,
    onSuccess: (response) => {
      replaceRowInCachedLists(queryClient, response.data)
      queryClient.invalidateQueries({ queryKey: ["estimatePurchases"] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveGlobalPurchase,
    onSuccess: (response) => {
      removeRowFromCachedLists(queryClient, response.data)
      queryClient.invalidateQueries({ queryKey: ["estimatePurchases"] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  return {
    purchases: purchasesQuery.data?.data ?? [],
    meta: purchasesQuery.data?.meta ?? null,
    params,
    search: params.q ?? "",
    statusFilter: params.status ?? "all",
    projectFilter: params.projectId ?? "",
    dateFromFilter: params.dateFrom ?? "",
    dateToFilter: params.dateTo ?? "",
    loading: purchasesQuery.isLoading,
    isFetching: purchasesQuery.isFetching,
    error:
      purchasesQuery.error?.message ??
      createMutation.error?.message ??
      updateMutation.error?.message ??
      archiveMutation.error?.message ??
      null,
    saving:
      createMutation.isPending ||
      updateMutation.isPending ||
      archiveMutation.isPending,
    setSearch: (q: string) => updateUrlParams({ q: q.trim() || undefined }),
    setStatusFilter: (status: GlobalPurchasesStatusFilter) =>
      updateUrlParams({ status }),
    setProjectFilter: (projectId: string | undefined) =>
      updateUrlParams({ projectId: projectId?.trim() || undefined }),
    setDateFilters: (dateFrom?: string, dateTo?: string) =>
      updateUrlParams({
        dateFrom: dateFrom?.trim() || undefined,
        dateTo: dateTo?.trim() || undefined,
      }),
    setCursor: (cursor: number) => updateUrlParams({ cursor }),
    refetch: async () => {
      await purchasesQuery.refetch()
    },
    createPurchase: async (input: GlobalPurchaseMutationInput) => {
      const response = await createMutation.mutateAsync(input)
      return response.data
    },
    updatePurchase: async (id: string, input: GlobalPurchaseMutationInput) => {
      const response = await updateMutation.mutateAsync({ id, input })
      return response.data
    },
    archivePurchase: async (id: string) => {
      const response = await archiveMutation.mutateAsync(id)
      return response.data
    },
  }
}
