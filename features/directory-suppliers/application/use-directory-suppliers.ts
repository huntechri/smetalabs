"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveDirectorySupplier,
  createDirectorySupplier,
  fetchDirectorySuppliers,
  updateDirectorySupplier,
} from "../api/directory-suppliers-client"
import { directorySuppliersQueryKeys } from "../api/directory-suppliers-query-keys"
import {
  getDirectorySuppliersListParams,
  type DirectorySupplierMutationInput,
} from "../model/directory-suppliers-model"

const DIRECTORY_SUPPLIERS_STALE_TIME_MS = 30_000
const DIRECTORY_SUPPLIERS_GC_TIME_MS = 5 * 60_000

export function useDirectorySuppliers() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const params = useMemo(
    () => getDirectorySuppliersListParams(searchParams),
    [searchParams]
  )

  const suppliersQuery = useQuery({
    queryKey: directorySuppliersQueryKeys.list(params),
    queryFn: () => fetchDirectorySuppliers(params),
    staleTime: DIRECTORY_SUPPLIERS_STALE_TIME_MS,
    gcTime: DIRECTORY_SUPPLIERS_GC_TIME_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  })

  const invalidateSuppliers = async () => {
    await queryClient.invalidateQueries({
      queryKey: directorySuppliersQueryKeys.all,
    })
  }

  const createMutation = useMutation({
    mutationFn: createDirectorySupplier,
    onSuccess: async (response) => {
      await invalidateSuppliers()
      await queryClient.invalidateQueries({
        queryKey: directorySuppliersQueryKeys.detail(response.data.id),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateDirectorySupplier,
    onSuccess: async (response) => {
      await invalidateSuppliers()
      await queryClient.invalidateQueries({
        queryKey: directorySuppliersQueryKeys.detail(response.data.id),
      })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveDirectorySupplier,
    onSuccess: async (response) => {
      await invalidateSuppliers()
      await queryClient.invalidateQueries({
        queryKey: directorySuppliersQueryKeys.detail(response.data.id),
      })
    },
  })

  return {
    suppliers: suppliersQuery.data?.data ?? [],
    meta: suppliersQuery.data?.meta ?? null,
    params,
    loading: suppliersQuery.isLoading,
    isFetching: suppliersQuery.isFetching,
    error:
      suppliersQuery.error?.message ??
      createMutation.error?.message ??
      updateMutation.error?.message ??
      archiveMutation.error?.message ??
      null,
    saving:
      createMutation.isPending ||
      updateMutation.isPending ||
      archiveMutation.isPending,
    refetch: async () => {
      await suppliersQuery.refetch()
    },
    createSupplier: async (input: DirectorySupplierMutationInput) => {
      const response = await createMutation.mutateAsync(input)
      return response.data
    },
    updateSupplier: async (
      id: string,
      input: DirectorySupplierMutationInput
    ) => {
      const response = await updateMutation.mutateAsync({ id, input })
      return response.data
    },
    archiveSupplier: async (id: string) => {
      const response = await archiveMutation.mutateAsync(id)
      return response.data
    },
  }
}
