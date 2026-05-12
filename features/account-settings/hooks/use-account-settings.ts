"use client"

import { useState, useEffect, useCallback } from "react"
import {
  updateProfile,
  updateWorkspace,
  updatePreferences,
  updateNotifications,
} from "@/app/actions/settings"
import type {
  AccountProfile,
  WorkspaceSettings,
  AccountPreferences,
  NotificationSettings,
  SecurityInfo,
} from "../types"

// ── Response shape from GET /api/settings and all mutation actions ──
export interface SettingsResponse {
  data: {
    profile: Partial<AccountProfile>
    workspace: Partial<WorkspaceSettings>
    preferences: Partial<AccountPreferences>
    notifications: Partial<NotificationSettings>
    security: Partial<SecurityInfo>
  }
  meta: { updatedAt: string | null }
}

// ── useSettings ──────────────────────────────────────────────

export function useSettings() {
  const [settings, setSettings] = useState<SettingsResponse["data"] | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/settings")
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(
          body?.error?.message ?? `Ошибка загрузки: ${res.status}`
        )
      }
      const json: SettingsResponse = await res.json()
      setSettings(json.data)
    } catch (err: any) {
      setError(err?.message ?? "Неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { settings, loading, error, refetch }
}

// ── useUpdateProfile ─────────────────────────────────────────

export function useUpdateProfile() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (
      data: Partial<AccountProfile>
    ): Promise<SettingsResponse["data"] | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await updateProfile(data)
        // Server Action может вернуть ошибку в виде plain object с полем error
        if (result && "error" in result) {
          throw new Error(
            (result as any).error?.message ?? "Ошибка сохранения"
          )
        }
        return (result as SettingsResponse)?.data ?? null
      } catch (err: any) {
        setError(err?.message ?? "Неизвестная ошибка")
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { updateProfile: mutate, loading, error }
}

// ── useUpdateWorkspace ───────────────────────────────────────

export function useUpdateWorkspace() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (
      data: Partial<WorkspaceSettings>
    ): Promise<SettingsResponse["data"] | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await updateWorkspace(data)
        if (result && "error" in result) {
          throw new Error(
            (result as any).error?.message ?? "Ошибка сохранения"
          )
        }
        return (result as SettingsResponse)?.data ?? null
      } catch (err: any) {
        setError(err?.message ?? "Неизвестная ошибка")
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { updateWorkspace: mutate, loading, error }
}

// ── useUpdatePreferences ─────────────────────────────────────

export function useUpdatePreferences() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (
      data: Partial<AccountPreferences>
    ): Promise<SettingsResponse["data"] | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await updatePreferences(data)
        if (result && "error" in result) {
          throw new Error(
            (result as any).error?.message ?? "Ошибка сохранения"
          )
        }
        return (result as SettingsResponse)?.data ?? null
      } catch (err: any) {
        setError(err?.message ?? "Неизвестная ошибка")
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { updatePreferences: mutate, loading, error }
}

// ── useUpdateNotifications ───────────────────────────────────

export function useUpdateNotifications() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (
      data: Partial<NotificationSettings>
    ): Promise<SettingsResponse["data"] | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await updateNotifications(data)
        if (result && "error" in result) {
          throw new Error(
            (result as any).error?.message ?? "Ошибка сохранения"
          )
        }
        return (result as SettingsResponse)?.data ?? null
      } catch (err: any) {
        setError(err?.message ?? "Неизвестная ошибка")
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { updateNotifications: mutate, loading, error }
}
