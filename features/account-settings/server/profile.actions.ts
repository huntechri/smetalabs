"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAuth } from "@/lib/auth/permissions"
import { ProfileSchema } from "./schemas"
import { updateProfileFields, upsertSettingsColumn } from "./settings.repository"
import { getMergedSettings } from "./settings.service"

export async function updateProfile(data: z.infer<typeof ProfileSchema>) {
  const user = await requireAuth()
  const parsed = ProfileSchema.parse(data)

  const profileUpdate: Record<string, string> = {}
  if (parsed.displayName !== undefined) profileUpdate.full_name = parsed.displayName
  if (parsed.phone !== undefined) profileUpdate.phone = parsed.phone
  if (parsed.jobTitle !== undefined) profileUpdate.position = parsed.jobTitle

  await updateProfileFields(user.id, profileUpdate)

  const settingsUpdate: Record<string, string> = {}
  if (parsed.language !== undefined) settingsUpdate.language = parsed.language
  if (parsed.timezone !== undefined) settingsUpdate.timezone = parsed.timezone
  if (Object.keys(settingsUpdate).length > 0) {
    await upsertSettingsColumn(user.id, "profile", settingsUpdate)
  }

  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}
