"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchSettings, type SettingsResponse } from "../api/settings-client"

export function useSettings() {
  const [settings, setSettings] = useState<SettingsResponse["data"] | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSettings(await fetchSettings())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void refetch()
    })
  }, [refetch])

  return { settings, loading, error, refetch }
}
