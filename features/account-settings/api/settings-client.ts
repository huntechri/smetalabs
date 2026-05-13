import type {
  AccountPreferences,
  AccountProfile,
  NotificationSettings,
  SecurityInfo,
  WorkspaceSettings,
} from "../types"

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

export async function fetchSettings() {
  const res = await fetch("/api/settings")
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message ?? `Ошибка загрузки: ${res.status}`)
  }

  const json: SettingsResponse = await res.json()
  return json.data
}
