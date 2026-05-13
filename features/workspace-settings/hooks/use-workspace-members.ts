"use client"

import { useCallback, useEffect, useState } from "react"
import type { Role } from "@/types/roles"
import type { WorkspaceMember } from "../types"
import {
  deleteWorkspaceMember,
  fetchWorkspaceMembers,
  sendWorkspaceMemberPasswordReset,
  updateWorkspaceMemberRole,
  updateWorkspaceMemberSuspension,
} from "../api/team-client"

export function useWorkspaceMembers() {
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setMembers(await fetchWorkspaceMembers())
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

  const withRefetch = useCallback(
    async (mutation: () => Promise<unknown>) => {
      const result = await mutation()
      await refetch()
      return result
    },
    [refetch]
  )

  const updateRole = useCallback(
    (userId: string, newRole: Role) =>
      withRefetch(() => updateWorkspaceMemberRole(userId, newRole)),
    [withRefetch]
  )

  const suspendMember = useCallback(
    (userId: string, suspend: boolean) =>
      withRefetch(() => updateWorkspaceMemberSuspension(userId, suspend)),
    [withRefetch]
  )

  const removeMember = useCallback(
    (userId: string) => withRefetch(() => deleteWorkspaceMember(userId)),
    [withRefetch]
  )

  const resetPassword = useCallback(
    (userId: string) =>
      withRefetch(() => sendWorkspaceMemberPasswordReset(userId)),
    [withRefetch]
  )

  return {
    members,
    loading,
    error,
    refetch,
    updateRole,
    suspendMember,
    removeMember,
    resetPassword,
  }
}
