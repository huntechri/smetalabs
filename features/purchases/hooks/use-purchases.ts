"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  fetchEstimatePurchases,
  type EstimatePurchasesParams,
} from "@/features/purchases/api/purchases-client"
import { purchasesQueryKeys } from "@/features/purchases/api/purchases-query-keys"
import { purchaseRows } from "@/features/purchases/__mocks__/purchases"
import type { PurchaseRow } from "@/types/purchase"

const ESTIMATE_PURCHASES_STALE_TIME_MS = 30_000
const ESTIMATE_PURCHASES_GC_TIME_MS = 5 * 60_000

type UsePurchasesInput = {
  estimateId: string
  projectId: string
}

export function usePurchases({ estimateId, projectId }: UsePurchasesInput) {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get("q")?.trim() ?? ""

  const queryParams = useMemo<EstimatePurchasesParams>(
    () => ({
      estimateId,
      projectId,
      q: searchQuery || undefined,
    }),
    [estimateId, projectId, searchQuery]
  )

  const purchasesQuery = useQuery({
    queryKey: purchasesQueryKeys.list(queryParams),
    queryFn: () => fetchEstimatePurchases(queryParams),
    staleTime: ESTIMATE_PURCHASES_STALE_TIME_MS,
    gcTime: ESTIMATE_PURCHASES_GC_TIME_MS,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  })

  // Use mocks as fallback when API is not yet available (e.g. during development)
  const data = purchasesQuery.data?.data ?? null
  const fallbackRows: PurchaseRow[] =
    data !== null ? data : purchaseRows

  // Client-side search filtering as additional safety net
  const filteredRows = useMemo(() => {
    if (!searchQuery) return fallbackRows
    const q = searchQuery.toLowerCase()
    return fallbackRows.filter((row) => row.title.toLowerCase().includes(q))
  }, [fallbackRows, searchQuery])

  return {
    purchases: filteredRows,
    isLoading: purchasesQuery.isLoading && purchasesQuery.data === undefined,
    isFetching: purchasesQuery.isFetching,
    isError: purchasesQuery.isError,
    error: purchasesQuery.error?.message ?? null,
    search: searchQuery,
    refetch: () => purchasesQuery.refetch(),
  }
}
