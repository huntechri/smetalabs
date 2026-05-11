"use client"

import { useState, useEffect, useCallback } from "react"
import { assignRole, removeRole } from "@/app/actions/access-control"
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
    case 500:
      return `Ошибка сервера при загрузке ${resource}${apiMessage ? `: ${apiMessage}` : ""}`
    default:
      return `Ошибка загрузки ${resource} (${status})${apiMessage ? `: ${apiMessage}` : ""}`
  }
}

// ── API types ──

export type ApiPermission = {
  id: string
  key: string
  label: string
  groupName: string
  description?: string | null
}

export type ApiRole = {
  id: string
  name: Role
  label: string
  locked: boolean
  description?: string | null
  permissions: ApiPermission[]
}

// ── useRoles ──

export function useRoles() {
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/access-control/roles", {
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
          `[useRoles] fetch failed: ${res.status} ${res.statusText}`,
          apiMessage || "(no body)"
        )
        const errMsg = resolveFetchError(res.status, apiMessage, "ролей")
        throw new Error(errMsg)
      }
      const json = await res.json()
      setRoles(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  return { roles, loading, error, refetch: fetchRoles }
}

// ── useAssignRole ──

export function useAssignRole() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (userId: string, roleId: string) => {
    setLoading(true)
    setError(null)
    try {
      await assignRole({ userId, roleId })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { assignRole: mutate, loading, error }
}

// ── useRemoveRole ──

export function useRemoveRole() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (userId: string, roleId: string) => {
    setLoading(true)
    setError(null)
    try {
      await removeRole({ userId, roleId })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { removeRole: mutate, loading, error }
}
