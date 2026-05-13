"use client"

import { useCallback, useState } from "react"
import type { WorkspaceSettings } from "../types"
import type { SettingsResponse } from "../api/settings-client"
import { updateWorkspaceSettings } from "../api/settings-actions"

export function useUpdateWorkspace() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (
      data: Partial<WorkspaceSettings>
    ): Promise<SettingsResponse["data"] | null> => {
      setLoading(true)
      setError(null)
      try {
        return await updateWorkspaceSettings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка")
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { updateWorkspace: mutate, loading, error }
}
