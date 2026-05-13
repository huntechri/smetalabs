"use client"

import { useCallback, useState } from "react"
import type { NotificationSettings } from "../types"
import type { SettingsResponse } from "../api/settings-client"
import { updateNotificationSettings } from "../api/settings-actions"

export function useUpdateNotifications() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (
      data: Partial<NotificationSettings>
    ): Promise<SettingsResponse["data"] | null> => {
      setLoading(true)
      setError(null)
      try {
        return await updateNotificationSettings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка")
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { updateNotifications: mutate, loading, error }
}
