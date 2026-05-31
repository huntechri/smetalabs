"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  appendDirectoryMaterialImportBatch,
  applyDirectoryMaterialImportJob,
  archiveDirectoryMaterial,
  createDirectoryMaterial,
  createDirectoryMaterialImportJob,
  fetchDirectoryMaterials,
  updateDirectoryMaterial,
} from "../api/directory-materials-client"
import { directoryMaterialsQueryKeys } from "../api/directory-materials-query-keys"
import { getDirectoryMaterialsListParams } from "../model/directory-materials-model"
import type {
  DirectoryMaterialImportApplyInput,
  DirectoryMaterialImportBatchInput,
  DirectoryMaterialImportCreateInput,
  DirectoryMaterialMutationInput,
} from "../types"

const DIRECTORY_MATERIALS_STALE_TIME_MS = 30_000
const DIRECTORY_MATERIALS_GC_TIME_MS = 5 * 60_000

export function useDirectoryMaterials() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const params = useMemo(
    () => getDirectoryMaterialsListParams(searchParams),
    [searchParams]
  )

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
      queryClient.invalidateQueries({
        queryKey: directoryMaterialsQueryKeys.all,
      }),
      queryClient.invalidateQueries({
        queryKey: directoryMaterialsQueryKeys.categories(),
      }),
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

  const appendImportBatchMutation = useMutation({
    mutationFn: appendDirectoryMaterialImportBatch,
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
      await materialsQuery.refetch()
    },
    createMaterial: async (input: DirectoryMaterialMutationInput) => {
      const response = await createMutation.mutateAsync(input)
      return response.data
    },
    updateMaterial: async (
      id: string,
      input: DirectoryMaterialMutationInput
    ) => {
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
    appendImportBatch: async (
      id: string,
      input: DirectoryMaterialImportBatchInput
    ) => {
      const response = await appendImportBatchMutation.mutateAsync({
        id,
        input,
      })
      return response.data
    },
    applyImportJob: async (
      id: string,
      input?: DirectoryMaterialImportApplyInput
    ) => {
      const response = await applyImportMutation.mutateAsync({ id, input })
      return response.data
    },
  }
}
