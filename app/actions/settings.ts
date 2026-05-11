"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { supabase } from "@/db"
import { requireAuth } from "@/lib/auth/permissions"

// ═══════════════════════════════════════════════════════════════
// Zod-схемы (соответствуют интерфейсам из features/account-settings/types.ts)
// ═══════════════════════════════════════════════════════════════

const ProfileSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
})

const WorkspaceSchema = z.object({
  workspaceName: z.string().optional(),
  companyLegalName: z.string().optional(),
  companyType: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  legalAddress: z.string().optional(),
  billingEmail: z.string().email("Некорректный email").optional().or(z.literal("")),
  companyPhone: z.string().optional(),
  defaultCurrency: z.string().optional(),
  defaultLocale: z.string().optional(),
  defaultTimezone: z.string().optional(),
})

const PreferencesSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).optional(),
  density: z.enum(["comfortable", "compact"]).optional(),
  dateFormat: z.string().optional(),
  numberFormat: z.string().optional(),
  defaultEstimateView: z.string().optional(),
})

const NotificationsSchema = z.object({
  projectUpdates: z.boolean().optional(),
  estimateUpdates: z.boolean().optional(),
  procurementUpdates: z.boolean().optional(),
  teamInvitations: z.boolean().optional(),
  billingNotifications: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
})

// ═══════════════════════════════════════════════════════════════
// Helper: upsert user_settings row, then return updated document
// ═══════════════════════════════════════════════════════════════

async function upsertSettings(userId: string, column: string, data: Record<string, unknown>) {
  // Проверяем, существует ли запись
  const { data: existing } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    // Обновляем конкретную JSONB-колонку
    const { error } = await supabase
      .from("user_settings")
      .update({
        [column]: data,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    if (error) throw error
  } else {
    // Создаём запись с дефолтными значениями и переданными данными
    const { error } = await supabase
      .from("user_settings")
      .insert({
        user_id: userId,
        [column]: data,
      })

    if (error) throw error
  }

  // Возвращаем обновлённый документ
  const { data: updated, error: fetchErr } = await supabase
    .from("user_settings")
    .select("profile, workspace, preferences, notifications, security, updated_at")
    .eq("user_id", userId)
    .single()

  if (fetchErr) throw fetchErr

  return {
    data: {
      profile: updated.profile ?? {},
      workspace: updated.workspace ?? {},
      preferences: updated.preferences ?? {},
      notifications: updated.notifications ?? {},
      security: updated.security ?? {},
    },
    meta: { updatedAt: updated.updated_at },
  }
}

// ═══════════════════════════════════════════════════════════════
// Server Actions
// ═══════════════════════════════════════════════════════════════

/**
 * Обновить профиль пользователя (displayName, email, phone, ...).
 */
export async function updateProfile(
  data: z.infer<typeof ProfileSchema>
) {
  const user = await requireAuth()
  const parsed = ProfileSchema.parse(data)

  const result = await upsertSettings(user.id, "profile", parsed)
  revalidatePath("/settings/account")
  return result
}

/**
 * Обновить настройки workspace.
 */
export async function updateWorkspace(
  data: z.infer<typeof WorkspaceSchema>
) {
  const user = await requireAuth()
  const parsed = WorkspaceSchema.parse(data)

  const result = await upsertSettings(user.id, "workspace", parsed)
  revalidatePath("/settings/account")
  return result
}

/**
 * Обновить предпочтения интерфейса (тема, плотность, форматы).
 */
export async function updatePreferences(
  data: z.infer<typeof PreferencesSchema>
) {
  const user = await requireAuth()
  const parsed = PreferencesSchema.parse(data)

  const result = await upsertSettings(user.id, "preferences", parsed)
  revalidatePath("/settings/account")
  return result
}

/**
 * Обновить настройки уведомлений.
 */
export async function updateNotifications(
  data: z.infer<typeof NotificationsSchema>
) {
  const user = await requireAuth()
  const parsed = NotificationsSchema.parse(data)

  const result = await upsertSettings(user.id, "notifications", parsed)
  revalidatePath("/settings/account")
  return result
}
