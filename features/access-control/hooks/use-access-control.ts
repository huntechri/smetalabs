"use client"

import { useState, useEffect, useCallback } from "react"
import { assignRole, removeRole } from "@/app/actions/access-control"
import type { Role } from "@/types/roles"

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
      const res = await fetch("/api/access-control/roles")
      if (!res.ok) throw new Error("Ошибка загрузки ролей")
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
