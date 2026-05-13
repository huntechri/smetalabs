"use client"

import { useCallback, useEffect, useState } from "react"
import type { WorkspaceOverview } from "../types"
import { fetchWorkspaceOverview } from "../api/team-client"

export function useWorkspaceOverview() {
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOverview(await fetchWorkspaceOverview())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void refetch()
    })
  }, [refetch])

  return { overview, loading, error, refetch }
}
