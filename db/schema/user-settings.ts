import { pgTable, uuid, jsonb, timestamp } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"

/**
 * Настройки аккаунта — JSONB-поддокументы.
 *
 * Каждая группа настроек хранится в отдельной JSONB-колонке,
 * что соответствует интерфейсам из features/account-settings/types.ts
 * без необходимости отдельных колонок для каждого поля.
 *
 * PK: user_id → profiles.id (ON DELETE CASCADE)
 * RLS: пользователь читает/редактирует только свою запись.
 */
export const userSettings = pgTable("user_settings", {
  user_id: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),

  /** AccountProfile (settings-only): { language, timezone } (public identity via profiles table) */
  profile: jsonb("profile").notNull().default({}),

  /** WorkspaceSettings (legal requisites only): { companyLegalName, companyType, ... } (workspaceName via profiles table) */
  workspace: jsonb("workspace").notNull().default({}),

  /** AccountPreferences: { theme, density, dateFormat, numberFormat, defaultEstimateView } */
  preferences: jsonb("preferences").notNull().default({}),

  /** NotificationSettings: { projectUpdates, estimateUpdates, procurementUpdates, ... } */
  notifications: jsonb("notifications").notNull().default({}),

  /** SecurityInfo: { twoFactorEnabled, lastLogin, activeSessionsCount } */
  security: jsonb("security").notNull().default({}),

  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})
