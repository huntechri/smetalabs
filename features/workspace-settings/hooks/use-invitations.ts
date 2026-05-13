"use client"

import { useCallback, useEffect, useState } from "react"
import type { WorkspaceInvitation } from "../types"
import {
  cancelWorkspaceInvitation,
  fetchWorkspaceInvitations,
  resendWorkspaceInvitation,
} from "../api/team-client"

export function useInvitations() {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setInvitations(await fetchWorkspaceInvitations())
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

  const cancelInvitation = useCallback(async (id: string) => {
    await cancelWorkspaceInvitation(id)
    setInvitations((prev) => prev.filter((inv) => inv.id !== id))
  }, [])

  const resendInvitation = useCallback(
    (id: string) => resendWorkspaceInvitation(id),
    []
  )

  return {
    invitations,
    loading,
    error,
    refetch,
    cancelInvitation,
    resendInvitation,
  }
}
