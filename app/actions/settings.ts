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
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Upsert a single JSONB column in user_settings by merging with existing keys. */
async function upsertSettingsColumn(
  userId: string,
  column: string,
  data: Record<string, unknown>
) {
  const { data: existing, error: selectError } = await supabase
    .from("user_settings")
    .select(`user_id, ${column}`)
    .eq("user_id", userId)
    .maybeSingle()

  if (selectError) throw selectError

  const current = ((existing as Record<string, unknown> | null)?.[column] ??
    {}) as Record<string, unknown>
  const merged = { ...current, ...data }

  if (existing) {
    const { error } = await supabase
      .from("user_settings")
      .update({
        [column]: merged,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    if (error) throw error
  } else {
    const { error } = await supabase.from("user_settings").insert({
      user_id: userId,
      [column]: merged,
    })

    if (error) throw error
  }
}

/** Fetch profiles + user_settings and return the merged document (same shape as GET /api/settings). */
async function getMergedSettings(userId: string, userEmail: string) {
  const { data: pData } = await supabase
    .from("profiles")
    .select("full_name, phone, position, workspace_name")
    .eq("id", userId)
    .maybeSingle()

  const { data: sData, error: sErr } = await supabase
    .from("user_settings")
    .select(
      "profile, workspace, preferences, notifications, security, updated_at"
    )
    .eq("user_id", userId)
    .single()

  if (sErr && sErr.code !== "PGRST116") throw sErr

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

// ═══════════════════════════════════════════════════════════════
// Server Actions
// ═══════════════════════════════════════════════════════════════

/**
 * Обновить профиль пользователя.
 * Разделяет данные:
 * - profiles.full_name, .phone, .position ← из data.displayName, data.phone, data.jobTitle
 * - user_settings.profile ← { language, timezone }
 */
export async function updateProfile(data: z.infer<typeof ProfileSchema>) {
  const user = await requireAuth()
  const parsed = ProfileSchema.parse(data)

  // ── Update profiles table (public identity) ──
  const profileUpdate: Record<string, string> = {}
  if (parsed.displayName !== undefined)
    profileUpdate.full_name = parsed.displayName
  if (parsed.phone !== undefined) profileUpdate.phone = parsed.phone
  if (parsed.jobTitle !== undefined) profileUpdate.position = parsed.jobTitle

  if (Object.keys(profileUpdate).length > 0) {
    const { error: pErr } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id)
    if (pErr) throw pErr
  }

  // ── Update user_settings.profile (language, timezone) ──
  const settingsUpdate: Record<string, string> = {}
  if (parsed.language !== undefined) settingsUpdate.language = parsed.language
  if (parsed.timezone !== undefined) settingsUpdate.timezone = parsed.timezone

  if (Object.keys(settingsUpdate).length > 0) {
    await upsertSettingsColumn(user.id, "profile", settingsUpdate)
  }

  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}

/**
 * Обновить настройки workspace.
 * Разделяет данные:
 * - profiles.workspace_name ← из data.workspaceName
 * - user_settings.workspace ← все юридические реквизиты
 */
export async function updateWorkspace(data: z.infer<typeof WorkspaceSchema>) {
  const user = await requireAuth()
  const parsed = WorkspaceSchema.parse(data)

  // ── Update profiles.workspace_name ──
  if (parsed.workspaceName !== undefined) {
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ workspace_name: parsed.workspaceName })
      .eq("id", user.id)
    if (pErr) throw pErr
  }

  // ── Update user_settings.workspace (legal requisites only) ──
  const legalFields: Partial<typeof parsed> = { ...parsed }
  delete legalFields.workspaceName
  if (Object.keys(legalFields).length > 0) {
    await upsertSettingsColumn(user.id, "workspace", legalFields)
  }

  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}

/**
 * Обновить предпочтения интерфейса (тема, плотность, форматы).
 */
export async function updatePreferences(
  data: z.infer<typeof PreferencesSchema>
) {
  const user = await requireAuth()
  const parsed = PreferencesSchema.parse(data)

  await upsertSettingsColumn(user.id, "preferences", parsed)
  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}

/**
 * Обновить настройки уведомлений.
 */
export async function updateNotifications(
  data: z.infer<typeof NotificationsSchema>
) {
  const user = await requireAuth()
  const parsed = NotificationsSchema.parse(data)

  await upsertSettingsColumn(user.id, "notifications", parsed)
  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}
