"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { NotificationSettings } from "../types"
import { updateNotificationSettings } from "../api/settings-actions"
import { settingsQueryKeys } from "../api/settings-query-keys"

export function useUpdateNotifications() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: Partial<NotificationSettings>) =>
      updateNotificationSettings(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.account(),
      })
    },
  })

  return {
    updateNotifications: async (data: Partial<NotificationSettings>) => {
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
