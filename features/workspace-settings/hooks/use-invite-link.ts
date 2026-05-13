"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchWorkspaceInviteLink,
  patchWorkspaceInviteLink,
} from "../api/team-client"
import { teamQueryKeys } from "../api/team-query-keys"

export function useInviteLink() {
  const queryClient = useQueryClient()
  const inviteLinkQuery = useQuery({
    queryKey: teamQueryKeys.inviteLink(),
    queryFn: fetchWorkspaceInviteLink,
  })
  const updateMutation = useMutation({
    mutationFn: patchWorkspaceInviteLink,
    onSuccess: (data) => {
      queryClient.setQueryData(teamQueryKeys.inviteLink(), data)
    },
  })
  const data = inviteLinkQuery.data

  return {
    enabled: data?.enabled ?? true,
    url: data?.url ?? null,
    defaultRole: data?.defaultRole ?? "viewer",
    loading: inviteLinkQuery.isLoading,
    saving: updateMutation.isPending,
    error: inviteLinkQuery.error?.message ?? updateMutation.error?.message ?? null,
    refetch: async () => {
      await inviteLinkQuery.refetch()
    },
    updateInviteLink: async (updates: {
      enabled?: boolean
      defaultRole?: string
    }) => {
      await updateMutation.mutateAsync(updates)
    },
  }
}
