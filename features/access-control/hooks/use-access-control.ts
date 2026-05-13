"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { assignRole, removeRole } from "@/app/actions/access-control"
import type { Role } from "@/types/roles"
import { fetchAccessRoles } from "../api/access-control-client"
import { accessControlQueryKeys } from "../api/access-control-query-keys"

export type ApiPermission = {
  id: string
  key: string
  label: string
  groupName: string
  description?: string | null
}

export type ApiRole = {
  id: string
  name: Role
  label: string
  locked: boolean
  description?: string | null
  permissions: ApiPermission[]
}

export function useRoles() {
  const query = useQuery({
    queryKey: accessControlQueryKeys.roles(),
    queryFn: fetchAccessRoles,
  })

  return {
    roles: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: async () => {
      await query.refetch()
    },
  }
}

export function useAssignRole() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignRole({ userId, roleId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: accessControlQueryKeys.roles(),
      })
    },
  })

  return {
    assignRole: (userId: string, roleId: string) =>
      mutation.mutateAsync({ userId, roleId }),
    loading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}

export function useRemoveRole() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      removeRole({ userId, roleId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: accessControlQueryKeys.roles(),
      })
    },
  })

  return {
    removeRole: (userId: string, roleId: string) =>
      mutation.mutateAsync({ userId, roleId }),
    loading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
