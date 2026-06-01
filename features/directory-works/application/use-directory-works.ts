"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  appendDirectoryWorkImportBatch,
  applyDirectoryWorkImportJob,
  archiveDirectoryWork,
  createDirectoryWork,
  createDirectoryWorkImportJob,
  fetchDirectoryWorks,
  updateDirectoryWork,
} from "../api/directory-works-client"
import { directoryWorksQueryKeys } from "../api/directory-works-query-keys"
import {
  getDirectoryWorksListParams,
  type DirectoryWorkImportApplyInput,
  type DirectoryWorkImportBatchInput,
  type DirectoryWorkImportCreateInput,
  type DirectoryWorkMutationInput,
} from "../model/directory-works-model"

const DIRECTORY_WORKS_STALE_TIME_MS = 30_000
const DIRECTORY_WORKS_GC_TIME_MS = 5 * 60_000

export function useDirectoryWorks() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const params = useMemo(
    () => getDirectoryWorksListParams(searchParams),
    [searchParams]
  )

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
      queryClient.invalidateQueries({
        queryKey: directoryWorksQueryKeys.categories(),
      }),
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
        queryKey: directoryWorksQueryKeys.aiSearch({
          query: response.data.title,
        }),
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
        queryKey: directoryWorksQueryKeys.aiSearch({
          query: response.data.title,
        }),
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

  const appendImportBatchMutation = useMutation({
    mutationFn: appendDirectoryWorkImportBatch,
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
        queryClient.invalidateQueries({ queryKey: ["directoryWorksAiSearch"] }),
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
      appendImportBatchMutation.error?.message ??
      applyImportMutation.error?.message ??
      null,
    saving:
      createMutation.isPending ||
      updateMutation.isPending ||
      archiveMutation.isPending ||
      createImportMutation.isPending ||
      appendImportBatchMutation.isPending ||
      applyImportMutation.isPending,
    importing:
      createImportMutation.isPending ||
      appendImportBatchMutation.isPending ||
      applyImportMutation.isPending,
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
    appendImportBatch: async (
      id: string,
      input: DirectoryWorkImportBatchInput
    ) => {
      const response = await appendImportBatchMutation.mutateAsync({
        id,
        input,
      })
      return response.data
    },
    applyImportJob: async (
      id: string,
      input?: DirectoryWorkImportApplyInput
    ) => {
      const response = await applyImportMutation.mutateAsync({ id, input })
      return response.data
    },
  }
}
