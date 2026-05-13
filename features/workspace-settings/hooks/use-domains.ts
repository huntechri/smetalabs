"use client"

import { useCallback, useEffect, useState } from "react"
import type { AllowedDomain } from "../types"
import {
  createWorkspaceDomain,
  deleteWorkspaceDomain,
  fetchWorkspaceDomains,
  updateWorkspaceAutoJoinDomains,
} from "../api/team-client"

export function useDomains() {
  const [domains, setDomains] = useState<AllowedDomain[]>([])
  const [autoJoin, setAutoJoin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchWorkspaceDomains()
      setDomains(result.domains)
      setAutoJoin(result.autoJoin)
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

  const addDomain = useCallback(async (domain: string) => {
    try {
      const newDomain = await createWorkspaceDomain(domain)
      setDomains((prev) => [...prev, newDomain])
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка добавления домена")
      return false
    }
  }, [])

  const removeDomain = useCallback(async (id: string) => {
    try {
      await deleteWorkspaceDomain(id)
      setDomains((prev) => prev.filter((d) => d.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления домена")
      return false
    }
  }, [])

  const setAutoJoinDomains = useCallback(async (value: boolean) => {
    try {
      await updateWorkspaceAutoJoinDomains(value)
      setAutoJoin(value)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения auto-join")
      return false
    }
  }, [])

  return {
    domains,
    autoJoin,
    loading,
    error,
    refetch,
    addDomain,
    removeDomain,
    setAutoJoinDomains,
  }
}
