"use client"

import { ProfileSettingsCard } from "./profile-settings-card"
import { WorkspaceSettingsCard } from "./workspace-settings-card"
import { PreferencesSettingsCard } from "./preferences-settings-card"
import { NotificationSettingsCard } from "./notification-settings-card"
import { SecuritySettingsCard } from "./security-settings-card"
import { SensitiveActionsCard } from "./sensitive-actions-card"
import { useSettings } from "../hooks/use-account-settings"

export function AccountSettingsView() {
  const settingsState = useSettings()

  return (
    <div className="flex flex-col gap-6">
      <ProfileSettingsCard {...settingsState} />
      <WorkspaceSettingsCard {...settingsState} />
      <PreferencesSettingsCard {...settingsState} />
      <NotificationSettingsCard {...settingsState} />
      <SecuritySettingsCard {...settingsState} />
      <SensitiveActionsCard />
    </div>
  )
}
