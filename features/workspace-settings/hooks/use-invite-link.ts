"use client"

import { useCallback, useEffect, useState } from "react"
import {
  fetchWorkspaceInviteLink,
  patchWorkspaceInviteLink,
} from "../api/team-client"

export function useInviteLink() {
  const [enabled, setEnabled] = useState(true)
  const [url, setUrl] = useState<string | null>(null)
  const [defaultRole, setDefaultRole] = useState("viewer")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWorkspaceInviteLink()
      setEnabled(data.enabled)
      setUrl(data.url)
      setDefaultRole(data.defaultRole)
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

  const updateInviteLink = useCallback(
    async (updates: { enabled?: boolean; defaultRole?: string }) => {
      setSaving(true)
      setError(null)
      try {
        const data = await patchWorkspaceInviteLink(updates)
        setEnabled(data.enabled)
        setUrl(data.url)
        setDefaultRole(data.defaultRole)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка сохранения")
      } finally {
        setSaving(false)
      }
    },
    []
  )

  return {
    enabled,
    url,
    defaultRole,
    loading,
    saving,
    error,
    refetch,
    updateInviteLink,
  }
}
