"use client"

import { useCallback, useState } from "react"
import type { AccountProfile } from "../types"
import type { SettingsResponse } from "../api/settings-client"
import { updateProfileSettings } from "../api/settings-actions"

export function useUpdateProfile() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (
      data: Partial<AccountProfile>
    ): Promise<SettingsResponse["data"] | null> => {
      setLoading(true)
      setError(null)
      try {
        return await updateProfileSettings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка")
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { updateProfile: mutate, loading, error }
}
