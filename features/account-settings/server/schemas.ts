import { z } from "zod"

export const ProfileSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
})

export const WorkspaceSchema = z.object({
  workspaceName: z.string().optional(),
  companyLegalName: z.string().optional(),
  companyType: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  legalAddress: z.string().optional(),
  billingEmail: z
    .string()
    .email("Некорректный email")
    .optional()
    .or(z.literal("")),
  companyPhone: z.string().optional(),
  defaultCurrency: z.string().optional(),
  defaultLocale: z.string().optional(),
  defaultTimezone: z.string().optional(),
})

export const PreferencesSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).optional(),
  density: z.enum(["comfortable", "compact"]).optional(),
  dateFormat: z.string().optional(),
  numberFormat: z.string().optional(),
  defaultEstimateView: z.string().optional(),
})

export const NotificationsSchema = z.object({
  projectUpdates: z.boolean().optional(),
  estimateUpdates: z.boolean().optional(),
  procurementUpdates: z.boolean().optional(),
  teamInvitations: z.boolean().optional(),
  billingNotifications: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
})
