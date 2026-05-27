"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchGlobalPurchaseMaterialOptions } from "@/features/global-purchases/api/global-purchases-client"

export function useGlobalPurchaseMaterialOptions(search: string, enabled: boolean = true) {
  const normalizedSearch = search.trim().replace(/\s+/g, " ")
  const canSearch = normalizedSearch.length >= 2

  const query = useQuery({
    queryKey: ["global-purchases", "material-options", normalizedSearch],
    queryFn: () => fetchGlobalPurchaseMaterialOptions(normalizedSearch),
    enabled: enabled && canSearch,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
  })

  return {
    materials: canSearch ? (query.data?.data ?? []) : [],
    loading: canSearch && (query.isLoading || query.isFetching),
    error: query.error instanceof Error ? query.error.message : null,
    canSearch,
  }
}
