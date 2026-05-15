"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { fetchDirectoryMaterials } from "../api/directory-materials-client"
import { directoryMaterialsQueryKeys } from "../api/directory-materials-query-keys"
import type {
  DirectoryMaterialsListParams,
  DirectoryMaterialsSort,
} from "../types"

type ReadonlySearchParams = {
  get: (name: string) => string | null
}

const DIRECTORY_MATERIALS_STALE_TIME_MS = 30_000
const DIRECTORY_MATERIALS_GC_TIME_MS = 5 * 60_000

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

function getSortParam(
  searchParams: ReadonlySearchParams
): DirectoryMaterialsSort | undefined {
  const sort = searchParams.get("sort")
  if (sort === "relevance" || sort === "updated_desc" || sort === "name_asc") {
    return sort
  }
  return undefined
}

function getListParams(searchParams: ReadonlySearchParams): DirectoryMaterialsListParams {
  return {
    q: getStringParam(searchParams, "q"),
    category: getStringParam(searchParams, "category"),
    subcategory: getStringParam(searchParams, "subcategory"),
    unit: getStringParam(searchParams, "unit"),
    status: searchParams.get("status") === "archived" ? "archived" : "active",
    supplier: getStringParam(searchParams, "supplier"),
    limit: getNumberParam(searchParams, "limit") ?? 50,
    cursor: getNumberParam(searchParams, "cursor") ?? 0,
    sort: getSortParam(searchParams) ?? "relevance",
  }
}

export function useDirectoryMaterials() {
  const searchParams = useSearchParams()
  const params = useMemo(() => getListParams(searchParams), [searchParams])

  const materialsQuery = useQuery({
    queryKey: directoryMaterialsQueryKeys.list(params),
    queryFn: () => fetchDirectoryMaterials(params),
    staleTime: DIRECTORY_MATERIALS_STALE_TIME_MS,
    gcTime: DIRECTORY_MATERIALS_GC_TIME_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  })

  return {
    materials: materialsQuery.data?.data ?? [],
    meta: materialsQuery.data?.meta ?? null,
    params,
    loading: materialsQuery.isLoading,
    isFetching: materialsQuery.isFetching,
    error: materialsQuery.error?.message ?? null,
    refetch: async () => {
      await materialsQuery.refetch()
    },
  }
}
