"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchDirectoryWorksCategories } from "../api/directory-works-client"
import { directoryWorksQueryKeys } from "../api/directory-works-query-keys"

const DIRECTORY_WORKS_CATEGORIES_STALE_TIME_MS = 5 * 60_000
const DIRECTORY_WORKS_CATEGORIES_GC_TIME_MS = 10 * 60_000

export function useDirectoryWorkCategories() {
  const categoriesQuery = useQuery({
    queryKey: directoryWorksQueryKeys.categories(),
    queryFn: fetchDirectoryWorksCategories,
    staleTime: DIRECTORY_WORKS_CATEGORIES_STALE_TIME_MS,
    gcTime: DIRECTORY_WORKS_CATEGORIES_GC_TIME_MS,
  })

  return {
    categories: categoriesQuery.data?.data.categories ?? [],
    loading: categoriesQuery.isLoading,
    error: categoriesQuery.error?.message ?? null,
  }
}
