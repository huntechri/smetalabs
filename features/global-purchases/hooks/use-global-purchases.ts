"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveGlobalPurchase,
  createGlobalPurchase,
  fetchGlobalPurchases,
  updateGlobalPurchase,
} from "@/features/global-purchases/api/global-purchases-client"
import { globalPurchasesQueryKeys } from "@/features/global-purchases/api/global-purchases-query-keys"
import type {
  GlobalPurchaseMutationInput,
  GlobalPurchasesListParams,
  GlobalPurchasesSort,
  GlobalPurchasesStatusFilter,
} from "@/types/global-purchases"

type ReadonlySearchParams = {
  get: (name: string) => string | null
}

const GLOBAL_PURCHASES_STALE_TIME_MS = 30_000
const GLOBAL_PURCHASES_GC_TIME_MS = 5 * 60_000

function getStringParam(searchParams: ReadonlySearchParams, key: string) {
  const value = searchParams.get(key)?.trim()
  return value || undefined
}

function getNumberParam(searchParams: ReadonlySearchParams, key: string) {
  const value = searchParams.get(key)
  if (!value) return undefined

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

function getStatusParam(searchParams: ReadonlySearchParams): GlobalPurchasesStatusFilter {
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

function getSortParam(searchParams: ReadonlySearchParams): GlobalPurchasesSort | undefined {
  const sort = searchParams.get("sort")
  if (sort === "relevance" || sort === "updated_desc" || sort === "title_asc") return sort
  return undefined
}

function getListParams(searchParams: ReadonlySearchParams): GlobalPurchasesListParams {
  return {
    q: getStringParam(searchParams, "q"),
    status: getStatusParam(searchParams),
    projectId: getStringParam(searchParams, "projectId"),
    limit: getNumberParam(searchParams, "limit") ?? 50,
    cursor: getNumberParam(searchParams, "cursor") ?? 0,
    sort: getSortParam(searchParams) ?? "relevance",
  }
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
    refetchOnWindowFocus: true,
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

    if ("q" in next || "status" in next || "projectId" in next || "sort" in next) {
      urlParams.delete("cursor")
    }

    const query = urlParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const invalidatePurchases = async () => {
    await queryClient.invalidateQueries({ queryKey: globalPurchasesQueryKeys.all })
  }

  const createMutation = useMutation({
    mutationFn: createGlobalPurchase,
    onSuccess: async (response) => {
      await invalidatePurchases()
      await queryClient.invalidateQueries({ queryKey: globalPurchasesQueryKeys.detail(response.data.id) })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateGlobalPurchase,
    onSuccess: async (response) => {
      await invalidatePurchases()
      await queryClient.invalidateQueries({ queryKey: globalPurchasesQueryKeys.detail(response.data.id) })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveGlobalPurchase,
    onSuccess: async (response) => {
      await invalidatePurchases()
      await queryClient.invalidateQueries({ queryKey: globalPurchasesQueryKeys.detail(response.data.id) })
    },
  })

  return {
    purchases: purchasesQuery.data?.data ?? [],
    meta: purchasesQuery.data?.meta ?? null,
    params,
    search: params.q ?? "",
    statusFilter: params.status ?? "all",
    projectFilter: params.projectId ?? "",
    loading: purchasesQuery.isLoading,
    isFetching: purchasesQuery.isFetching,
    error:
      purchasesQuery.error?.message ??
      createMutation.error?.message ??
      updateMutation.error?.message ??
      archiveMutation.error?.message ??
      null,
    saving: createMutation.isPending || updateMutation.isPending || archiveMutation.isPending,
    setSearch: (q: string) => updateUrlParams({ q: q.trim() || undefined }),
    setStatusFilter: (status: GlobalPurchasesStatusFilter) => updateUrlParams({ status }),
    setProjectFilter: (projectId: string | undefined) =>
      updateUrlParams({ projectId: projectId?.trim() || undefined }),
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
