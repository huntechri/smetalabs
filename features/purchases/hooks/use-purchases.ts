"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchEstimatePurchases,
  addProjectEstimatePurchase,
  updateProjectEstimatePurchase,
  archiveProjectEstimatePurchase,
  type EstimatePurchasesParams,
} from "@/features/purchases/api/purchases-client"
import { purchasesQueryKeys } from "@/features/purchases/api/purchases-query-keys"
import type { PurchaseRow, AddPurchaseInput, UpdatePurchaseInput } from "@/types/purchase"

const ESTIMATE_PURCHASES_STALE_TIME_MS = 30_000
const ESTIMATE_PURCHASES_GC_TIME_MS = 5 * 60_000

type UsePurchasesInput = {
  estimateId: string
  projectId: string
}

const EMPTY_ROWS: PurchaseRow[] = []

export function usePurchases({ estimateId, projectId }: UsePurchasesInput) {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get("q")?.trim() ?? ""
  const queryClient = useQueryClient()

  const queryParams = useMemo<EstimatePurchasesParams>(
    () => ({
      estimateId,
      projectId,
      q: searchQuery || undefined,
    }),
    [estimateId, projectId, searchQuery]
  )

  const listKey = purchasesQueryKeys.list(queryParams)

  const purchasesQuery = useQuery({
    queryKey: listKey,
    queryFn: () => fetchEstimatePurchases(queryParams),
    staleTime: ESTIMATE_PURCHASES_STALE_TIME_MS,
    gcTime: ESTIMATE_PURCHASES_GC_TIME_MS,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  })

  // Use empty array as fallback when API has no data
  const data = purchasesQuery.data?.data ?? null
  const fallbackRows: PurchaseRow[] =
    data !== null ? data : EMPTY_ROWS

  // Client-side search filtering as additional safety net
  const filteredRows = useMemo(() => {
    if (!searchQuery) return fallbackRows
    const q = searchQuery.toLowerCase()
    return fallbackRows.filter((row) => row.title.toLowerCase().includes(q))
  }, [fallbackRows, searchQuery])

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: purchasesQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: ["projects"] })
  }

  const addMutation = useMutation({
    mutationKey: purchasesQueryKeys.mutations.add(),
    mutationFn: (input: AddPurchaseInput) =>
      addProjectEstimatePurchase(projectId, estimateId, input),
    onSuccess: invalidateList,
  })

  const updateMutation = useMutation({
    mutationKey: purchasesQueryKeys.mutations.update("pending"),
    mutationFn: ({
      purchaseId,
      input,
    }: {
      purchaseId: string
      input: UpdatePurchaseInput
    }) =>
      updateProjectEstimatePurchase(projectId, estimateId, purchaseId, input),
    onSuccess: invalidateList,
  })

  const archiveMutation = useMutation({
    mutationKey: purchasesQueryKeys.mutations.archive("pending"),
    mutationFn: (purchaseId: string) =>
      archiveProjectEstimatePurchase(projectId, estimateId, purchaseId),
    onSuccess: invalidateList,
  })

  return {
    purchases: filteredRows,
    isLoading: purchasesQuery.isLoading && purchasesQuery.data === undefined,
    isFetching: purchasesQuery.isFetching,
    isError: purchasesQuery.isError,
    error: purchasesQuery.error?.message ?? null,
    search: searchQuery,
    refetch: () => purchasesQuery.refetch(),
    addPurchase: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    addError: addMutation.error?.message ?? null,
    updatePurchase: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,
    archivePurchase: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
    archiveError: archiveMutation.error?.message ?? null,
  }
}
