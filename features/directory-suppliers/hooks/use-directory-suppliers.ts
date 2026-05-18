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
import type {
  DirectorySupplierMutationInput,
  DirectorySuppliersListParams,
  DirectorySuppliersSort,
} from "../types"

type ReadonlySearchParams = {
  get: (name: string) => string | null
}

const DIRECTORY_SUPPLIERS_STALE_TIME_MS = 30_000
const DIRECTORY_SUPPLIERS_GC_TIME_MS = 5 * 60_000

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

function getSortParam(searchParams: ReadonlySearchParams): DirectorySuppliersSort | undefined {
  const sort = searchParams.get("sort")
  if (sort === "relevance" || sort === "updated_desc" || sort === "name_asc") return sort
  return undefined
}

function getListParams(searchParams: ReadonlySearchParams): DirectorySuppliersListParams {
  return {
    q: getStringParam(searchParams, "q"),
    status: searchParams.get("status") === "archived" ? "archived" : "active",
    limit: getNumberParam(searchParams, "limit") ?? 50,
    cursor: getNumberParam(searchParams, "cursor") ?? 0,
    sort: getSortParam(searchParams) ?? "relevance",
  }
}

export function useDirectorySuppliers() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const params = useMemo(() => getListParams(searchParams), [searchParams])

  const suppliersQuery = useQuery({
    queryKey: directorySuppliersQueryKeys.list(params),
    queryFn: () => fetchDirectorySuppliers(params),
    staleTime: DIRECTORY_SUPPLIERS_STALE_TIME_MS,
    gcTime: DIRECTORY_SUPPLIERS_GC_TIME_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  })

  const invalidateSuppliers = async () => {
    await queryClient.invalidateQueries({ queryKey: directorySuppliersQueryKeys.all })
  }

  const createMutation = useMutation({
    mutationFn: createDirectorySupplier,
    onSuccess: async (response) => {
      await invalidateSuppliers()
      await queryClient.invalidateQueries({ queryKey: directorySuppliersQueryKeys.detail(response.data.id) })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateDirectorySupplier,
    onSuccess: async (response) => {
      await invalidateSuppliers()
      await queryClient.invalidateQueries({ queryKey: directorySuppliersQueryKeys.detail(response.data.id) })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveDirectorySupplier,
    onSuccess: async (response) => {
      await invalidateSuppliers()
      await queryClient.invalidateQueries({ queryKey: directorySuppliersQueryKeys.detail(response.data.id) })
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
    updateSupplier: async (id: string, input: DirectorySupplierMutationInput) => {
      const response = await updateMutation.mutateAsync({ id, input })
      return response.data
    },
    archiveSupplier: async (id: string) => {
      const response = await archiveMutation.mutateAsync(id)
      return response.data
    },
  }
}
