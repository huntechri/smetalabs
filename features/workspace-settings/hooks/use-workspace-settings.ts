"use client"

import { useState, useEffect, useCallback } from "react"
import type {
  WorkspaceMember,
  WorkspaceOverview,
  WorkspaceInvitation,
  AllowedDomain,
} from "../types"
import type { Role } from "@/types/roles"

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
    case 409:
      return apiMessage || `Конфликт: ${resource}`
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
  lastActiveAt?: string | null
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
    lastActiveAt: api.lastActiveAt ?? "—"
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

  const mutateMember = useCallback(
    async (
      userId: string,
      method: "PATCH" | "DELETE" | "POST",
      body?: Record<string, unknown>,
      pathSuffix = ""
    ) => {
      const res = await fetch(`/api/team/members/${userId}${pathSuffix}`, {
        method,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!res.ok) {
        let apiMessage = ""
        try {
          const json = await res.json()
          apiMessage = json?.error?.message ?? ""
        } catch {
          // response body is not JSON
        }
        throw new Error(resolveFetchError(res.status, apiMessage, "участника"))
      }

      await fetchMembers()
      return res.json().catch(() => ({ success: true }))
    },
    [fetchMembers]
  )

  const updateRole = useCallback(
    (userId: string, newRole: Role) =>
      mutateMember(userId, "PATCH", { role: newRole }),
    [mutateMember]
  )

  const suspendMember = useCallback(
    (userId: string, suspend: boolean) =>
      mutateMember(userId, "PATCH", { status: suspend ? "suspended" : "active" }),
    [mutateMember]
  )

  const removeMember = useCallback(
    (userId: string) => mutateMember(userId, "DELETE"),
    [mutateMember]
  )

  const resetPassword = useCallback(
    (userId: string) => mutateMember(userId, "POST", undefined, "/reset-password"),
    [mutateMember]
  )

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    updateRole,
    suspendMember,
    removeMember,
    resetPassword,
  }
}

// ── useWorkspaceOverview ──

export function useWorkspaceOverview() {
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/team/overview", {
        credentials: "include",
      })
      if (!res.ok) {
        let apiMessage = ""
        try {
          const body = await res.json()
          apiMessage = body?.error?.message ?? ""
        } catch { /* no JSON */ }
        throw new Error(resolveFetchError(res.status, apiMessage, "обзора workspace"))
      }
      const json = await res.json()
      setOverview(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  return { overview, loading, error, refetch: fetchOverview }
}

// ── useInviteMember ──

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
        const res = await fetch("/api/team/invitations", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role, message }),
        })
        if (!res.ok) {
          let apiMessage = ""
          try {
            const body = await res.json()
            apiMessage = body?.error?.message ?? ""
          } catch { /* no JSON */ }
          throw new Error(resolveFetchError(res.status, apiMessage, "приглашения"))
        }
        const json = await res.json()
        const warning =
          !json.meta?.emailSent && json.meta?.emailError
            ? `Приглашение сохранено, но письмо не отправлено: ${json.meta.emailError}`
            : null

        return { data: json.data, warning }
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

// ── useInvitations ──

export function useInvitations() {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/team/invitations", {
        credentials: "include",
      })
      if (!res.ok) {
        let apiMessage = ""
        try {
          const body = await res.json()
          apiMessage = body?.error?.message ?? ""
        } catch { /* no JSON */ }
        throw new Error(resolveFetchError(res.status, apiMessage, "приглашений"))
      }
      const json = await res.json()
      setInvitations(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  const cancelInvitation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/team/invitations/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        let apiMessage = ""
        try {
          const body = await res.json()
          apiMessage = body?.error?.message ?? ""
        } catch { /* no JSON */ }
        throw new Error(resolveFetchError(res.status, apiMessage, "отзыва приглашения"))
      }
      // Remove from local state
      setInvitations((prev) => prev.filter((inv) => inv.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отзыва приглашения")
      return false
    }
  }, [])

  return { invitations, loading, error, refetch: fetchInvitations, cancelInvitation }
}

// ── useDomains ──

export function useDomains() {
  const [domains, setDomains] = useState<AllowedDomain[]>([])
  const [autoJoin, setAutoJoin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDomains = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/team/domains", {
        credentials: "include",
      })
      if (!res.ok) {
        let apiMessage = ""
        try {
          const body = await res.json()
          apiMessage = body?.error?.message ?? ""
        } catch { /* no JSON */ }
        throw new Error(resolveFetchError(res.status, apiMessage, "доменов"))
      }
      const json = await res.json()
      setDomains(json.data ?? [])
      setAutoJoin(json.meta?.autoJoinDomains ?? false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])

  const addDomain = useCallback(async (domain: string) => {
    try {
      const res = await fetch("/api/team/domains", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      })
      if (!res.ok) {
        let apiMessage = ""
        try {
          const body = await res.json()
          apiMessage = body?.error?.message ?? ""
        } catch { /* no JSON */ }
        throw new Error(resolveFetchError(res.status, apiMessage, "добавления домена"))
      }
      const json = await res.json()
      setDomains((prev) => [...prev, json.data])
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка добавления домена")
      return false
    }
  }, [])

  const removeDomain = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/team/domains/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        let apiMessage = ""
        try {
          const body = await res.json()
          apiMessage = body?.error?.message ?? ""
        } catch { /* no JSON */ }
        throw new Error(resolveFetchError(res.status, apiMessage, "удаления домена"))
      }
      setDomains((prev) => prev.filter((d) => d.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления домена")
      return false
    }
  }, [])

  const setAutoJoinDomains = useCallback(async (value: boolean) => {
    try {
      const res = await fetch("/api/team/domains", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoJoinDomains: value }),
      })
      if (!res.ok) {
        let apiMessage = ""
        try {
          const body = await res.json()
          apiMessage = body?.error?.message ?? ""
        } catch { /* no JSON */ }
        throw new Error(resolveFetchError(res.status, apiMessage, "настройки auto-join"))
      }
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
    refetch: fetchDomains,
    addDomain,
    removeDomain,
    setAutoJoinDomains,
  }
}

// ── useInviteLink ──

export function useInviteLink() {
  const [enabled, setEnabled] = useState(true)
  const [url, setUrl] = useState<string | null>(null)
  const [defaultRole, setDefaultRole] = useState("viewer")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchInviteLink = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/team/invite-link", {
        credentials: "include",
      })
      if (!res.ok) {
        let apiMessage = ""
        try {
          const body = await res.json()
          apiMessage = body?.error?.message ?? ""
        } catch { /* no JSON */ }
        throw new Error(resolveFetchError(res.status, apiMessage, "ссылки"))
      }
      const json = await res.json()
      const data = json.data
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
    fetchInviteLink()
  }, [fetchInviteLink])

  const updateInviteLink = useCallback(
    async (updates: { enabled?: boolean; defaultRole?: string }) => {
      setSaving(true)
      setError(null)
      try {
        const res = await fetch("/api/team/invite-link", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
        if (!res.ok) {
          let apiMessage = ""
          try {
            const body = await res.json()
            apiMessage = body?.error?.message ?? ""
          } catch { /* no JSON */ }
          throw new Error(resolveFetchError(res.status, apiMessage, "обновления ссылки"))
        }
        const json = await res.json()
        const data = json.data
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
    refetch: fetchInviteLink,
    updateInviteLink,
  }
}
