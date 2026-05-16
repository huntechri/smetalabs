"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchDirectoryMaterialsCategories } from "../api/directory-materials-client"
import { directoryMaterialsQueryKeys } from "../api/directory-materials-query-keys"

const DIRECTORY_MATERIALS_CATEGORIES_STALE_TIME_MS = 5 * 60_000
const DIRECTORY_MATERIALS_CATEGORIES_GC_TIME_MS = 10 * 60_000

export function useDirectoryMaterialCategories() {
  const categoriesQuery = useQuery({
    queryKey: directoryMaterialsQueryKeys.categories(),
    queryFn: fetchDirectoryMaterialsCategories,
    staleTime: DIRECTORY_MATERIALS_CATEGORIES_STALE_TIME_MS,
    gcTime: DIRECTORY_MATERIALS_CATEGORIES_GC_TIME_MS,
  })

  return {
    categories: categoriesQuery.data?.data.categories ?? [],
    units: categoriesQuery.data?.data.units ?? [],
    suppliers: categoriesQuery.data?.data.suppliers ?? [],
    loading: categoriesQuery.isLoading,
    error: categoriesQuery.error?.message ?? null,
  }
}
