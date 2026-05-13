import {
  getProfileSettingsSource,
  getUserSettingsSource,
} from "./settings.repository"

export async function getMergedSettings(userId: string, userEmail: string) {
  const pData = await getProfileSettingsSource(userId)
  const sData = await getUserSettingsSource(userId)

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
        workspaceName: pData?.workspace_name ?? "",
        companyLegalName: sData?.workspace?.companyLegalName ?? "",
        companyType: sData?.workspace?.companyType ?? "",
        registrationNumber: sData?.workspace?.registrationNumber ?? "",
        taxNumber: sData?.workspace?.taxNumber ?? "",
        legalAddress: sData?.workspace?.legalAddress ?? "",
        billingEmail: sData?.workspace?.billingEmail ?? "",
        companyPhone: sData?.workspace?.companyPhone ?? "",
        defaultCurrency: sData?.workspace?.defaultCurrency ?? "RUB",
        defaultLocale: sData?.workspace?.defaultLocale ?? "ru-RU",
        defaultTimezone: sData?.workspace?.defaultTimezone ?? "UTC",
      },
      preferences: sData?.preferences ?? {},
      notifications: sData?.notifications ?? {},
      security: sData?.security ?? {},
    },
    meta: { updatedAt: sData?.updated_at ?? null },
  }
}
