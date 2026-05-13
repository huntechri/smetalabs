"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { WorkspaceSettings } from "../types"
import { updateWorkspaceSettings } from "../api/settings-actions"
import { settingsQueryKeys } from "../api/settings-query-keys"

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: Partial<WorkspaceSettings>) =>
      updateWorkspaceSettings(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.account(),
      })
    },
  })

  return {
    updateWorkspace: async (data: Partial<WorkspaceSettings>) => {
      try {
        return await mutation.mutateAsync(data)
      } catch {
        return null
      }
    },
    loading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
