export interface AccountProfile {
  displayName: string
  email: string
  phone: string
  jobTitle: string
  language: string
  timezone: string
}

export interface WorkspaceSettings {
  workspaceName: string
  companyLegalName: string
  companyType: string
  registrationNumber: string
  taxNumber: string
  legalAddress: string
  billingEmail: string
  companyPhone: string
  defaultCurrency: string
  defaultLocale: string
  defaultTimezone: string
}

export interface WorkspaceAccessInfo {
  role: "owner" | "admin" | "manager" | "estimator" | "viewer" | null
  canEditWorkspace: boolean
}

export interface AccountPreferences {
  theme: "system" | "light" | "dark"
  density: "comfortable" | "compact"
  dateFormat: string
  numberFormat: string
  defaultEstimateView: string
}

export interface NotificationSettings {
  projectUpdates: boolean
  estimateUpdates: boolean
  procurementUpdates: boolean
  teamInvitations: boolean
  billingNotifications: boolean
  weeklySummary: boolean
}

export interface SecurityInfo {
  twoFactorEnabled: boolean
  lastLogin: string | null
}
