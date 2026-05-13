"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAuth } from "@/lib/auth/permissions"
import { NotificationsSchema } from "./schemas"
import { upsertSettingsColumn } from "./settings.repository"
import { getMergedSettings } from "./settings.service"

export async function updateNotifications(
  data: z.infer<typeof NotificationsSchema>
) {
  const user = await requireAuth()
  const parsed = NotificationsSchema.parse(data)
  await upsertSettingsColumn(user.id, "notifications", parsed)
  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}
