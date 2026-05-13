"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAuth } from "@/lib/auth/permissions"
import { WorkspaceSchema } from "./schemas"
import { updateProfileFields, upsertSettingsColumn } from "./settings.repository"
import { getMergedSettings } from "./settings.service"

export async function updateWorkspace(data: z.infer<typeof WorkspaceSchema>) {
  const user = await requireAuth()
  const parsed = WorkspaceSchema.parse(data)

  if (parsed.workspaceName !== undefined) {
    await updateProfileFields(user.id, { workspace_name: parsed.workspaceName })
  }

  const legalFields: Partial<typeof parsed> = { ...parsed }
  delete legalFields.workspaceName
  if (Object.keys(legalFields).length > 0) {
    await upsertSettingsColumn(user.id, "workspace", legalFields)
  }

  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}
