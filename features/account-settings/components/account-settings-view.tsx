"use client"

import { Separator } from "@/components/ui/separator"
import { NotificationSettingsCard } from "./notification-settings-card"
import { PreferencesSettingsCard } from "./preferences-settings-card"
import { ProfileSettingsCard } from "./profile-settings-card"
import { SecuritySettingsCard } from "./security-settings-card"
import { SensitiveActionsCard } from "./sensitive-actions-card"
import { WorkspaceSettingsCard } from "./workspace-settings-card"
import { useSettings } from "../hooks/use-settings"

export function AccountSettingsView() {
  const { settings, loading, error, refetch } = useSettings()

  return (
    <div className="flex flex-col gap-6">
      <ProfileSettingsCard
        profile={settings?.profile}
        loading={loading}
        error={error}
        refetch={refetch}
      />
      <WorkspaceSettingsCard
        workspace={settings?.workspace}
        workspaceAccess={settings?.workspaceAccess}
        loading={loading}
        error={error}
        refetch={refetch}
      />
      <PreferencesSettingsCard
        preferences={settings?.preferences}
        loading={loading}
        error={error}
        refetch={refetch}
      />
      <NotificationSettingsCard
        notifications={settings?.notifications}
        loading={loading}
        error={error}
        refetch={refetch}
      />
      <SecuritySettingsCard
        security={settings?.security}
        loading={loading}
        error={error}
        refetch={refetch}
      />
      <Separator />
      <SensitiveActionsCard
        workspaceAccess={settings?.workspaceAccess}
        workspaceName={settings?.workspace?.workspaceName}
        refetch={refetch}
      />
    </div>
  )
}
