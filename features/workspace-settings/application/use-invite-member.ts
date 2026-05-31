"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createWorkspaceInvitation } from "../api/team-client"
import { teamQueryKeys } from "../api/team-query-keys"

export function useInviteMember() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({
      email,
      role,
      message,
    }: {
      email: string
      role: string
      message?: string
    }) => createWorkspaceInvitation(email, role, message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: teamQueryKeys.invitations(),
      })
    },
  })

  return {
    invite: (email: string, role: string, message?: string) =>
      mutation.mutateAsync({ email, role, message }),
    loading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
