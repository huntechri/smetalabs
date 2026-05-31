"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  cancelWorkspaceInvitation,
  fetchWorkspaceInvitations,
  resendWorkspaceInvitation,
} from "../api/team-client"
import { teamQueryKeys } from "../api/team-query-keys"

export function useInvitations() {
  const queryClient = useQueryClient()
  const invitationsQuery = useQuery({
    queryKey: teamQueryKeys.invitations(),
    queryFn: fetchWorkspaceInvitations,
  })
  const cancelMutation = useMutation({
    mutationFn: cancelWorkspaceInvitation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: teamQueryKeys.invitations(),
      })
    },
  })
  const resendMutation = useMutation({ mutationFn: resendWorkspaceInvitation })

  return {
    invitations: invitationsQuery.data ?? [],
    loading: invitationsQuery.isLoading,
    error: invitationsQuery.error?.message ?? null,
    refetch: async () => {
      await invitationsQuery.refetch()
    },
    cancelInvitation: (id: string) => cancelMutation.mutateAsync(id),
    resendInvitation: (id: string) => resendMutation.mutateAsync(id),
  }
}
