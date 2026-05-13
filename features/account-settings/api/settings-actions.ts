import {
  updateNotifications,
  updatePreferences,
  updateProfile,
  updateWorkspace,
} from "@/app/actions/settings"
import type {
  AccountPreferences,
  AccountProfile,
  NotificationSettings,
  WorkspaceSettings,
} from "../types"
import type { SettingsResponse } from "./settings-client"

type ActionResult = SettingsResponse | { error?: { message?: string } } | null

function ensureSettingsData(result: ActionResult) {
  if (result && "error" in result) {
    throw new Error(result.error?.message ?? "Ошибка сохранения")
  }

  return (result as SettingsResponse)?.data ?? null
}

export async function updateProfileSettings(data: Partial<AccountProfile>) {
  return ensureSettingsData(await updateProfile(data))
}

export async function updateWorkspaceSettings(data: Partial<WorkspaceSettings>) {
  return ensureSettingsData(await updateWorkspace(data))
}

export async function updatePreferenceSettings(
  data: Partial<AccountPreferences>
) {
  return ensureSettingsData(await updatePreferences(data))
}

export async function updateNotificationSettings(
  data: Partial<NotificationSettings>
) {
  return ensureSettingsData(await updateNotifications(data))
}
