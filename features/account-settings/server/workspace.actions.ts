"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAuth } from "@/lib/auth/permissions"
import { getPrimaryWorkspace, getWorkspaceRole } from "@/lib/auth/team"
import { WorkspaceSchema } from "./schemas"
import {
  updateProfileFields,
  upsertSettingsColumn,
} from "./settings.repository"
import { getMergedSettings } from "./settings.service"

export async function updateWorkspace(data: z.infer<typeof WorkspaceSchema>) {
  const user = await requireAuth()
  const ownerId = await getPrimaryWorkspace(user.id)
  const role = await getWorkspaceRole(user.id, ownerId)

  if (role !== "owner") {
    return {
      error: {
        code: "FORBIDDEN",
        message: "Редактировать рабочее пространство может только владелец",
      },
    }
  }

  const parsed = WorkspaceSchema.parse(data)

  if (parsed.workspaceName !== undefined) {
    await updateProfileFields(ownerId, { workspace_name: parsed.workspaceName })
  }

  const legalFields: Partial<typeof parsed> = { ...parsed }
  delete legalFields.workspaceName
  if (Object.keys(legalFields).length > 0) {
    await upsertSettingsColumn(ownerId, "workspace", legalFields)
  }

  revalidatePath("/settings/account")
  return getMergedSettings(user.id, user.email ?? "")
}
