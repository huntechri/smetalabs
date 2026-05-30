"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveDirectoryCounterparty,
  createDirectoryCounterparty,
  fetchDirectoryCounterparties,
  updateDirectoryCounterparty,
} from "../api/directory-counterparties-client"
import { directoryCounterpartiesQueryKeys } from "../api/directory-counterparties-query-keys"
import {
  getListParams,
  type DirectoryCounterpartyMutationInput,
} from "../model/directory-counterparties-model"

const DIRECTORY_COUNTERPARTIES_STALE_TIME_MS = 30_000
const DIRECTORY_COUNTERPARTIES_GC_TIME_MS = 5 * 60_000

export function useDirectoryCounterparties() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const params = useMemo(() => getListParams(searchParams), [searchParams])

  const counterpartiesQuery = useQuery({
    queryKey: directoryCounterpartiesQueryKeys.list(params),
    queryFn: () => fetchDirectoryCounterparties(params),
    staleTime: DIRECTORY_COUNTERPARTIES_STALE_TIME_MS,
    gcTime: DIRECTORY_COUNTERPARTIES_GC_TIME_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  })

  const invalidateCounterparties = async () => {
    await queryClient.invalidateQueries({
      queryKey: directoryCounterpartiesQueryKeys.all,
    })
  }

  const createMutation = useMutation({
    mutationFn: createDirectoryCounterparty,
    onSuccess: async (response) => {
      await invalidateCounterparties()
      await queryClient.invalidateQueries({
        queryKey: directoryCounterpartiesQueryKeys.detail(response.data.id),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateDirectoryCounterparty,
    onSuccess: async (response) => {
      await invalidateCounterparties()
      await queryClient.invalidateQueries({
        queryKey: directoryCounterpartiesQueryKeys.detail(response.data.id),
      })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveDirectoryCounterparty,
    onSuccess: async (response) => {
      await invalidateCounterparties()
      await queryClient.invalidateQueries({
        queryKey: directoryCounterpartiesQueryKeys.detail(response.data.id),
      })
    },
  })

  return {
    counterparties: counterpartiesQuery.data?.data ?? [],
    meta: counterpartiesQuery.data?.meta ?? null,
    params,
    loading: counterpartiesQuery.isLoading,
    isFetching: counterpartiesQuery.isFetching,
    error:
      counterpartiesQuery.error?.message ??
      createMutation.error?.message ??
      updateMutation.error?.message ??
      archiveMutation.error?.message ??
      null,
    saving:
      createMutation.isPending ||
      updateMutation.isPending ||
      archiveMutation.isPending,
    refetch: async () => {
      await counterpartiesQuery.refetch()
    },
    createCounterparty: async (input: DirectoryCounterpartyMutationInput) => {
      const response = await createMutation.mutateAsync(input)
      return response.data
    },
    updateCounterparty: async (
      id: string,
      input: DirectoryCounterpartyMutationInput
    ) => {
      const response = await updateMutation.mutateAsync({ id, input })
      return response.data
    },
    archiveCounterparty: async (id: string) => {
      const response = await archiveMutation.mutateAsync(id)
      return response.data
    },
  }
}
