"use client"

import { useCallback, useState } from "react"
import type { AccountPreferences } from "../types"
import type { SettingsResponse } from "../api/settings-client"
import { updatePreferenceSettings } from "../api/settings-actions"

export function useUpdatePreferences() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (
      data: Partial<AccountPreferences>
    ): Promise<SettingsResponse["data"] | null> => {
      setLoading(true)
      setError(null)
      try {
        return await updatePreferenceSettings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка")
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { updatePreferences: mutate, loading, error }
}
