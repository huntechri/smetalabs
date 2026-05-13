"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AccountPreferences } from "../types"
import { updatePreferenceSettings } from "../api/settings-actions"
import { settingsQueryKeys } from "../api/settings-query-keys"

export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: Partial<AccountPreferences>) =>
      updatePreferenceSettings(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.account(),
      })
    },
  })

  return {
    updatePreferences: async (data: Partial<AccountPreferences>) => {
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
