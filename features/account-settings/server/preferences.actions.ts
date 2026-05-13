"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAuth } from "@/lib/auth/permissions"
import { PreferencesSchema } from "./schemas"
import { upsertSettingsColumn } from "./settings.repository"
import { getMergedSettings } from "./settings.service"

export async function updatePreferences(data: z.infer<typeof PreferencesSchema>) {
  const user = await requireAuth()
  const parsed = PreferencesSchema.parse(data)
  await upsertSettingsColumn(user.id, "preferences", parsed)
  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}
