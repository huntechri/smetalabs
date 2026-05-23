import { getPrimaryWorkspace, getWorkspaceRole } from "@/lib/auth/team"
import {
  getProfileSettingsSource,
  getUserSettingsSource,
} from "./settings.repository"

export async function getMergedSettings(userId: string, userEmail: string) {
  const ownerId = await getPrimaryWorkspace(userId)
  const workspaceRole = await getWorkspaceRole(userId, ownerId)
  const canEditWorkspace = workspaceRole === "owner"

  const pData = await getProfileSettingsSource(userId)
  const sData = await getUserSettingsSource(userId)
  const workspaceProfile = await getProfileSettingsSource(ownerId)
  const workspaceSettings = await getUserSettingsSource(ownerId)

  return {
    data: {
      profile: {
        displayName: pData?.full_name ?? "",
        email: userEmail ?? "",
        phone: pData?.phone ?? "",
        jobTitle: pData?.position ?? "",
        language: sData?.profile?.language ?? "ru",
        timezone: sData?.profile?.timezone ?? "UTC",
      },
      workspace: {
        workspaceName: workspaceProfile?.workspace_name ?? "",
        companyLegalName: workspaceSettings?.workspace?.companyLegalName ?? "",
        companyType: workspaceSettings?.workspace?.companyType ?? "",
        registrationNumber:
          workspaceSettings?.workspace?.registrationNumber ?? "",
        taxNumber: workspaceSettings?.workspace?.taxNumber ?? "",
        legalAddress: workspaceSettings?.workspace?.legalAddress ?? "",
        billingEmail: workspaceSettings?.workspace?.billingEmail ?? "",
        companyPhone: workspaceSettings?.workspace?.companyPhone ?? "",
        defaultCurrency: workspaceSettings?.workspace?.defaultCurrency ?? "RUB",
        defaultLocale: workspaceSettings?.workspace?.defaultLocale ?? "ru-RU",
        defaultTimezone: workspaceSettings?.workspace?.defaultTimezone ?? "UTC",
      },
      workspaceAccess: {
        role: workspaceRole,
        canEditWorkspace,
      },
      preferences: sData?.preferences ?? {},
      notifications: sData?.notifications ?? {},
      security: sData?.security ?? {},
    },
    meta: { updatedAt: sData?.updated_at ?? null },
  }
}
