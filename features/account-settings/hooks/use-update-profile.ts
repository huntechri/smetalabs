"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AccountProfile } from "../types"
import { updateProfileSettings } from "../api/settings-actions"
import { settingsQueryKeys } from "../api/settings-query-keys"

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: Partial<AccountProfile>) => updateProfileSettings(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.account(),
      })
    },
  })

  return {
    updateProfile: async (data: Partial<AccountProfile>) => {
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
