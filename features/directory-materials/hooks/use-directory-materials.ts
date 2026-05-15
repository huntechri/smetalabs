"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  applyDirectoryMaterialImportJob,
  archiveDirectoryMaterial,
  createDirectoryMaterial,
  createDirectoryMaterialImportJob,
  fetchDirectoryMaterials,
  updateDirectoryMaterial,
} from "../api/directory-materials-client"
import { directoryMaterialsQueryKeys } from "../api/directory-materials-query-keys"
import type {
  DirectoryMaterialImportCreateInput,
  DirectoryMaterialMutationInput,
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
  const queryClient = useQueryClient()
  const params = useMemo(() => getListParams(searchParams), [searchParams])

  const materialsQuery = useQuery({
    queryKey: directoryMaterialsQueryKeys.list(params),
    queryFn: () => fetchDirectoryMaterials(params),
    staleTime: DIRECTORY_MATERIALS_STALE_TIME_MS,
    gcTime: DIRECTORY_MATERIALS_GC_TIME_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  })

  const invalidateMaterials = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: directoryMaterialsQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: directoryMaterialsQueryKeys.categories() }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: createDirectoryMaterial,
    onSuccess: async (response) => {
      await invalidateMaterials()
      await queryClient.invalidateQueries({
        queryKey: directoryMaterialsQueryKeys.detail(response.data.id),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateDirectoryMaterial,
    onSuccess: async (response) => {
      await invalidateMaterials()
      await queryClient.invalidateQueries({
        queryKey: directoryMaterialsQueryKeys.detail(response.data.id),
      })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveDirectoryMaterial,
    onSuccess: async (response) => {
      await invalidateMaterials()
      await queryClient.invalidateQueries({
        queryKey: directoryMaterialsQueryKeys.detail(response.data.id),
      })
    },
  })

  const createImportMutation = useMutation({
    mutationFn: createDirectoryMaterialImportJob,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: directoryMaterialsQueryKeys.importJob(response.data.job.id),
      })
    },
  })

  const applyImportMutation = useMutation({
    mutationFn: applyDirectoryMaterialImportJob,
    onSuccess: async (response) => {
      await Promise.all([
        invalidateMaterials(),
        queryClient.invalidateQueries({
          queryKey: directoryMaterialsQueryKeys.importJob(response.data.job.id),
        }),
      ])
    },
  })

  return {
    materials: materialsQuery.data?.data ?? [],
    meta: materialsQuery.data?.meta ?? null,
    params,
    loading: materialsQuery.isLoading,
    isFetching: materialsQuery.isFetching,
    error:
      materialsQuery.error?.message ??
      createMutation.error?.message ??
      updateMutation.error?.message ??
      archiveMutation.error?.message ??
      createImportMutation.error?.message ??
      applyImportMutation.error?.message ??
      null,
    saving:
      createMutation.isPending ||
      updateMutation.isPending ||
      archiveMutation.isPending ||
      createImportMutation.isPending ||
      applyImportMutation.isPending,
    importing: createImportMutation.isPending || applyImportMutation.isPending,
    refetch: async () => {
      await materialsQuery.refetch()
    },
    createMaterial: async (input: DirectoryMaterialMutationInput) => {
      const response = await createMutation.mutateAsync(input)
      return response.data
    },
    updateMaterial: async (id: string, input: DirectoryMaterialMutationInput) => {
      const response = await updateMutation.mutateAsync({ id, input })
      return response.data
    },
    archiveMaterial: async (id: string) => {
      const response = await archiveMutation.mutateAsync(id)
      return response.data
    },
    createImportJob: async (input: DirectoryMaterialImportCreateInput) => {
      const response = await createImportMutation.mutateAsync(input)
      return response.data
    },
    applyImportJob: async (id: string) => {
      const response = await applyImportMutation.mutateAsync(id)
      return response.data
    },
  }
}
