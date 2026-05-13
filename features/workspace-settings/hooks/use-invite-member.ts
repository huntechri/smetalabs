"use client"

import { useCallback, useState } from "react"
import type { WorkspaceInvitation } from "../types"
import { createWorkspaceInvitation } from "../api/team-client"

export function useInviteMember() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invite = useCallback(
    async (
      email: string,
      role: string,
      message?: string
    ): Promise<{ data: WorkspaceInvitation; warning: string | null }> => {
      setLoading(true)
      setError(null)
      try {
        return await createWorkspaceInvitation(email, role, message)
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Неизвестная ошибка"
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { invite, loading, error }
}
