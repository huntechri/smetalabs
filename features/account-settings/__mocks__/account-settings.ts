import type {
  AccountProfile,
  WorkspaceSettings,
  AccountPreferences,
  NotificationSettings,
  SecurityInfo,
} from "../types"

export const mockProfile: AccountProfile = {
  displayName: "Алексей Смирнов",
  email: "a.smirnov@stroygrad.ru",
  phone: "+7 (916) 123-45-67",
  jobTitle: "Главный инженер",
  language: "ru",
  timezone: "Europe/Moscow",
}

/**
 * Profile fields that come from the `profiles` table (public identity).
 * In a real app these are fetched from profiles and merged by the API.
 */
export const mockProfilesRow = {
  full_name: "Алексей Смирнов",
  phone: "+7 (916) 123-45-67",
  position: "Главный инженер",
  workspace_name: "ООО «СтройГрад»",
}

export const mockWorkspace: WorkspaceSettings = {
  workspaceName: "ООО «СтройГрад»",
  companyLegalName: 'Общество с ограниченной ответственностью "СтройГрад"',
  companyType: "ООО",
  registrationNumber: "1027700132195",
  taxNumber: "7701234567",
  legalAddress:
    "127006, г. Москва, ул. Малая Дмитровка, д. 12, стр. 1, офис 305",
  billingEmail: "billing@stroygrad.ru",
  companyPhone: "+7 (495) 987-65-43",
  defaultCurrency: "RUB",
  defaultLocale: "ru-RU",
  defaultTimezone: "UTC",
}

export const mockPreferences: AccountPreferences = {
  theme: "system",
  density: "comfortable",
  dateFormat: "ДД.ММ.ГГГГ",
  numberFormat: "1 000,00",
  defaultEstimateView: "table",
}

export const mockNotifications: NotificationSettings = {
  projectUpdates: true,
  estimateUpdates: true,
  procurementUpdates: false,
  teamInvitations: true,
  billingNotifications: true,
  weeklySummary: true,
}

export const mockSecurity: SecurityInfo = {
  twoFactorEnabled: false,
  lastLogin: "2026-05-11T09:15:00+03:00",
}
