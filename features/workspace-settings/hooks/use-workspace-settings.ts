"use client"

import { useState, useEffect, useCallback } from "react"
import type { WorkspaceMember } from "../types"

// ── Helpers ──

/**
 * Преобразует HTTP-статус + сообщение от API в понятный пользователю текст ошибки.
 */
function resolveFetchError(status: number, apiMessage: string, resource: string): string {
  switch (status) {
    case 401:
      return "Необходимо войти в систему"
    case 403:
      return "Недостаточно прав для доступа"
    case 404:
      return `API для ${resource} не найден`
    case 500:
      return `Ошибка сервера при загрузке ${resource}${apiMessage ? `: ${apiMessage}` : ""}`
    default:
      return `Ошибка загрузки ${resource} (${status})${apiMessage ? `: ${apiMessage}` : ""}`
  }
}

// ── API response types ──

type ApiMember = {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
  roles: Array<{ id: string; name: string; label: string }>
  status: string
  joinedAt: string
  primaryRole: string | null
  primaryRoleLabel: string | null
  phone?: string | null
  position?: string | null
}

function mapApiMember(api: ApiMember): WorkspaceMember {
  return {
    id: api.id,
    name: api.name,
    email: api.email ?? "",
    avatarUrl: api.avatarUrl ?? undefined,
    role: (api.primaryRole as WorkspaceMember["role"]) ?? "viewer",
    status: (api.status as WorkspaceMember["status"]) ?? "active",
    joinedAt: api.joinedAt,
    lastActiveAt: "—", // API пока не возвращает lastActiveAt
  }
}

// ── useWorkspaceMembers ──

export function useWorkspaceMembers() {
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/team/members", {
        credentials: "include",
      })
      if (!res.ok) {
        let apiMessage = ""
        try {
          const body = await res.json()
          apiMessage = body?.error?.message ?? ""
        } catch {
          // response body is not JSON
        }
        console.error(
          `[useWorkspaceMembers] fetch failed: ${res.status} ${res.statusText}`,
          apiMessage || "(no body)"
        )
        const errMsg = resolveFetchError(res.status, apiMessage, "участников")
        throw new Error(errMsg)
      }
      const json = await res.json()
      setMembers(json.data.map(mapApiMember))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return { members, loading, error, refetch: fetchMembers }
}
