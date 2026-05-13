"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Role } from "@/types/roles"
import {
  deleteWorkspaceMember,
  fetchWorkspaceMembers,
  sendWorkspaceMemberPasswordReset,
  updateWorkspaceMemberRole,
  updateWorkspaceMemberSuspension,
} from "../api/team-client"
import { teamQueryKeys } from "../api/team-query-keys"

export function useWorkspaceMembers() {
  const queryClient = useQueryClient()
  const membersQuery = useQuery({
    queryKey: teamQueryKeys.members(),
    queryFn: fetchWorkspaceMembers,
  })

  const invalidateMembers = () =>
    queryClient.invalidateQueries({ queryKey: teamQueryKeys.members() })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      updateWorkspaceMemberRole(userId, role),
    onSuccess: invalidateMembers,
  })
  const suspendMemberMutation = useMutation({
    mutationFn: ({ userId, suspend }: { userId: string; suspend: boolean }) =>
      updateWorkspaceMemberSuspension(userId, suspend),
    onSuccess: invalidateMembers,
  })
  const removeMemberMutation = useMutation({
    mutationFn: deleteWorkspaceMember,
    onSuccess: invalidateMembers,
  })
  const resetPasswordMutation = useMutation({
    mutationFn: sendWorkspaceMemberPasswordReset,
    onSuccess: invalidateMembers,
  })

  return {
    members: membersQuery.data ?? [],
    loading: membersQuery.isLoading,
    error: membersQuery.error?.message ?? null,
    refetch: async () => {
      await membersQuery.refetch()
    },
    updateRole: (userId: string, role: Role) =>
      updateRoleMutation.mutateAsync({ userId, role }),
    suspendMember: (userId: string, suspend: boolean) =>
      suspendMemberMutation.mutateAsync({ userId, suspend }),
    removeMember: (userId: string) => removeMemberMutation.mutateAsync(userId),
    resetPassword: (userId: string) => resetPasswordMutation.mutateAsync(userId),
  }
}
