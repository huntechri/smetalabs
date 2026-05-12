"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { supabase } from "@/db"
import { requireAuth } from "@/lib/auth/permissions"
import { createClient } from "@/lib/supabase/server"

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

async function upsertSettingsColumn(userId: string, column: string, data: Record<string, unknown>) {
  const { data: existing, error: selectError } = await supabase
    .from("user_settings")
    .select(`user_id, ${column}`)
    .eq("user_id", userId)
    .maybeSingle()

  if (selectError) throw selectError

  const current = ((existing as Record<string, unknown> | null)?.[column] ?? {}) as Record<string, unknown>
  const merged = { ...current, ...data }

  if (existing) {
    const { error } = await supabase
      .from("user_settings")
      .update({ [column]: merged, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
    if (error) throw error
    return
  }

  const { error } = await supabase.from("user_settings").insert({ user_id: userId, [column]: merged })
  if (error) throw error
}

async function getMergedSettings(userId: string, userEmail: string) {
  const { data: pData } = await supabase
    .from("profiles")
    .select("full_name, phone, position, workspace_name")
    .eq("id", userId)
    .maybeSingle()

  const { data: sData, error: sErr } = await supabase
    .from("user_settings")
    .select("profile, workspace, preferences, notifications, security, updated_at")
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

async function getRequestOrigin() {
  const headersList = await headers()
  const forwardedHost = headersList.get("x-forwarded-host")
  const host = forwardedHost ?? headersList.get("host") ?? "localhost:3000"
  const proto = headersList.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function updateProfile(data: z.infer<typeof ProfileSchema>) {
  const user = await requireAuth()
  const parsed = ProfileSchema.parse(data)

  const profileUpdate: Record<string, string> = {}
  if (parsed.displayName !== undefined) profileUpdate.full_name = parsed.displayName
  if (parsed.phone !== undefined) profileUpdate.phone = parsed.phone
  if (parsed.jobTitle !== undefined) profileUpdate.position = parsed.jobTitle

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id)
    if (error) throw error
  }

  const settingsUpdate: Record<string, string> = {}
  if (parsed.language !== undefined) settingsUpdate.language = parsed.language
  if (parsed.timezone !== undefined) settingsUpdate.timezone = parsed.timezone
  if (Object.keys(settingsUpdate).length > 0) await upsertSettingsColumn(user.id, "profile", settingsUpdate)

  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}

export async function updateWorkspace(data: z.infer<typeof WorkspaceSchema>) {
  const user = await requireAuth()
  const parsed = WorkspaceSchema.parse(data)

  if (parsed.workspaceName !== undefined) {
    const { error } = await supabase
      .from("profiles")
      .update({ workspace_name: parsed.workspaceName })
      .eq("id", user.id)
    if (error) throw error
  }

  const legalFields: Partial<typeof parsed> = { ...parsed }
  delete legalFields.workspaceName
  if (Object.keys(legalFields).length > 0) await upsertSettingsColumn(user.id, "workspace", legalFields)

  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}

export async function updatePreferences(data: z.infer<typeof PreferencesSchema>) {
  const user = await requireAuth()
  const parsed = PreferencesSchema.parse(data)
  await upsertSettingsColumn(user.id, "preferences", parsed)
  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}

export async function updateNotifications(data: z.infer<typeof NotificationsSchema>) {
  const user = await requireAuth()
  const parsed = NotificationsSchema.parse(data)
  await upsertSettingsColumn(user.id, "notifications", parsed)
  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}

export async function sendOwnPasswordResetEmailAction() {
  const user = await requireAuth()
  const client = await createClient()
  const origin = await getRequestOrigin()
  const { error } = await client.auth.resetPasswordForEmail(user.email!, {
    redirectTo: `${origin}/set-password`,
  })

  if (error) throw new Error(`Ошибка отправки ссылки для сброса пароля: ${error.message}`)

  return {
    success: true,
    message: "Ссылка для сброса пароля отправлена на email",
  }
}
