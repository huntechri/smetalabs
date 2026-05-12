"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { supabase } from "@/db"
import { requireAuth } from "@/lib/auth/permissions"
import {
  canManageTeamForWorkspace,
  getWorkspaceMemberByUser,
  requireCurrentWorkspace,
} from "@/lib/auth/team"

const AssignRoleSchema = z.object({
  userId: z.string().uuid("Некорректный ID пользователя"),
  roleId: z.string().uuid("Некорректный ID роли"),
})

const RemoveRoleSchema = z.object({
  userId: z.string().uuid("Некорректный ID пользователя"),
  roleId: z.string().uuid("Некорректный ID роли"),
})

async function requireWorkspaceRoleManager() {
  const user = await requireAuth()
  const ownerId = await requireCurrentWorkspace(user.id)
  if (!(await canManageTeamForWorkspace(user.id, ownerId))) {
    throw new Error("Forbidden: недостаточно прав для изменения ролей")
  }
  return { user, ownerId }
}

async function getRoleName(roleId: string) {
  const { data, error } = await supabase
    .from("roles")
    .select("name, locked")
    .eq("id", roleId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Роль не найдена")
  return data as { name: string; locked: boolean }
}

export async function assignRole(input: z.infer<typeof AssignRoleSchema>) {
  const { user, ownerId } = await requireWorkspaceRoleManager()
  const parsed = AssignRoleSchema.parse(input)
  const role = await getRoleName(parsed.roleId)

  if (role.name === "owner")
    throw new Error("Нельзя назначить роль владельца этим действием")
  if (!["admin", "manager", "estimator", "viewer"].includes(role.name)) {
    throw new Error("Некорректная workspace-роль")
  }

  const target = await getWorkspaceMemberByUser(parsed.userId, ownerId, true)
  if (!target) throw new Error("Участник не найден в текущем workspace")
  if (parsed.userId === ownerId || target.role === "owner") {
    throw new Error("Нельзя изменить владельца workspace")
  }
  if (parsed.userId === user.id && role.name !== "admin") {
    throw new Error("Нельзя понизить собственные права администратора")
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({ role_id: parsed.roleId, updated_at: new Date().toISOString() })
    .eq("user_id", parsed.userId)
    .eq("owner_id", ownerId)

  if (error) throw error

  revalidatePath("/team")
  revalidatePath("/settings/access")
  return { success: true, message: "Роль workspace обновлена" }
}

export async function removeRole(input: z.infer<typeof RemoveRoleSchema>) {
  await requireWorkspaceRoleManager()
  const parsed = RemoveRoleSchema.parse(input)
  const role = await getRoleName(parsed.roleId)

  if (role.locked || role.name === "owner" || role.name === "admin") {
    throw new Error(`Нельзя снять защищённую роль: ${role.name}`)
  }

  const { ownerId } = await requireWorkspaceRoleManager()
  const target = await getWorkspaceMemberByUser(parsed.userId, ownerId, true)
  if (!target) throw new Error("Участник не найден в текущем workspace")
  if (target.roleId !== parsed.roleId)
    return { success: true, message: "Роль уже не назначена" }

  const { data: viewerRole, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "viewer")
    .maybeSingle()
  if (roleError) throw roleError
  if (!viewerRole?.id) throw new Error("Роль viewer не найдена")

  const { error } = await supabase
    .from("workspace_members")
    .update({ role_id: viewerRole.id, updated_at: new Date().toISOString() })
    .eq("user_id", parsed.userId)
    .eq("owner_id", ownerId)

  if (error) throw error

  revalidatePath("/team")
  revalidatePath("/settings/access")
  return { success: true, message: "Роль workspace сброшена до viewer" }
}
