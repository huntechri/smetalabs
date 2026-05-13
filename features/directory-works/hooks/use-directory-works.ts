"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  applyDirectoryWorkImportJob,
  archiveDirectoryWork,
  createDirectoryWork,
  createDirectoryWorkImportJob,
  fetchDirectoryWorks,
  updateDirectoryWork,
} from "../api/directory-works-client"
import { directoryWorksQueryKeys } from "../api/directory-works-query-keys"
import type {
  DirectoryWorkImportCreateInput,
  DirectoryWorkMutationInput,
  DirectoryWorksListParams,
  DirectoryWorksSort,
} from "../types"

type ReadonlySearchParams = {
  get: (name: string) => string | null
}

const DIRECTORY_WORKS_STALE_TIME_MS = 30_000
const DIRECTORY_WORKS_GC_TIME_MS = 5 * 60_000

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

function getSortParam(searchParams: ReadonlySearchParams): DirectoryWorksSort | undefined {
  const sort = searchParams.get("sort")
  if (sort === "relevance" || sort === "updated_desc" || sort === "title_asc") {
    return sort
  }
  return undefined
}

function getListParams(searchParams: ReadonlySearchParams): DirectoryWorksListParams {
  return {
    q: getStringParam(searchParams, "q"),
    category: getStringParam(searchParams, "category"),
    subcategory: getStringParam(searchParams, "subcategory"),
    unit: getStringParam(searchParams, "unit"),
    status: searchParams.get("status") === "archived" ? "archived" : "active",
    limit: getNumberParam(searchParams, "limit") ?? 50,
    cursor: getNumberParam(searchParams, "cursor") ?? 0,
    sort: getSortParam(searchParams) ?? "relevance",
  }
}

export function useDirectoryWorks() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const params = useMemo(() => getListParams(searchParams), [searchParams])

  const worksQuery = useQuery({
    queryKey: directoryWorksQueryKeys.list(params),
    queryFn: () => fetchDirectoryWorks(params),
    staleTime: DIRECTORY_WORKS_STALE_TIME_MS,
    gcTime: DIRECTORY_WORKS_GC_TIME_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  })

  const invalidateWorks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: directoryWorksQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: directoryWorksQueryKeys.categories() }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: createDirectoryWork,
    onSuccess: async (response) => {
      await invalidateWorks()
      await queryClient.invalidateQueries({
        queryKey: directoryWorksQueryKeys.detail(response.data.id),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateDirectoryWork,
    onSuccess: async (response) => {
      await invalidateWorks()
      await queryClient.invalidateQueries({
        queryKey: directoryWorksQueryKeys.detail(response.data.id),
      })
      await queryClient.invalidateQueries({
        queryKey: directoryWorksQueryKeys.aiSearch({ query: response.data.title }),
      })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveDirectoryWork,
    onSuccess: async (response) => {
      await invalidateWorks()
      await queryClient.invalidateQueries({
        queryKey: directoryWorksQueryKeys.detail(response.data.id),
      })
      await queryClient.invalidateQueries({
        queryKey: directoryWorksQueryKeys.aiSearch({ query: response.data.title }),
      })
    },
  })

  const createImportMutation = useMutation({
    mutationFn: createDirectoryWorkImportJob,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: directoryWorksQueryKeys.importJob(response.data.job.id),
      })
    },
  })

  const applyImportMutation = useMutation({
    mutationFn: applyDirectoryWorkImportJob,
    onSuccess: async (response) => {
      await Promise.all([
        invalidateWorks(),
        queryClient.invalidateQueries({
          queryKey: directoryWorksQueryKeys.importJob(response.data.job.id),
        }),
        queryClient.invalidateQueries({
          queryKey: ["directoryWorksAiSearch"],
        }),
      ])
    },
  })

  return {
    works: worksQuery.data?.data ?? [],
    meta: worksQuery.data?.meta ?? null,
    params,
    loading: worksQuery.isLoading,
    isFetching: worksQuery.isFetching,
    error:
      worksQuery.error?.message ??
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
      await worksQuery.refetch()
    },
    createWork: async (input: DirectoryWorkMutationInput) => {
      const response = await createMutation.mutateAsync(input)
      return response.data
    },
    updateWork: async (id: string, input: DirectoryWorkMutationInput) => {
      const response = await updateMutation.mutateAsync({ id, input })
      return response.data
    },
    archiveWork: async (id: string) => {
      const response = await archiveMutation.mutateAsync(id)
      return response.data
    },
    createImportJob: async (input: DirectoryWorkImportCreateInput) => {
      const response = await createImportMutation.mutateAsync(input)
      return response.data
    },
    applyImportJob: async (id: string) => {
      const response = await applyImportMutation.mutateAsync(id)
      return response.data
    },
  }
}
