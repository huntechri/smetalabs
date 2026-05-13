"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { supabase } from "@/db"
import { requireAuth } from "@/lib/auth/permissions"
import {
  getPrimaryWorkspace,
  getRoleId,
  getWorkspaceMemberByUser,
  getWorkspaceRole,
} from "@/lib/auth/team"

const TransferOwnershipSchema = z.object({
  targetUserId: z.string().uuid("Некорректный ID нового владельца"),
})

const DeleteWorkspaceSchema = z.object({
  confirmation: z.string().min(1, "Введите подтверждение"),
})

type DangerousActionResult = {
  success: true
  message: string
  redirectTo?: string
}

async function getWorkspaceName(ownerId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("workspace_name")
    .eq("id", ownerId)
    .maybeSingle()

  if (error) throw error

  return data?.workspace_name?.trim() || "workspace"
}

async function getActiveMembershipCount(userId: string) {
  const { count, error } = await supabase
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active")

  if (error) throw error

  return count ?? 0
}

async function ensurePersonalWorkspace(userId: string) {
  if ((await getActiveMembershipCount(userId)) > 0) return

  const ownerRoleId = await getRoleId("owner")
  const now = new Date().toISOString()

  const { error } = await supabase.from("workspace_members").upsert(
    {
      user_id: userId,
      owner_id: userId,
      role_id: ownerRoleId,
      status: "active",
      joined_at: now,
      updated_at: now,
    },
    { onConflict: "user_id,owner_id" }
  )

  if (error) throw error
}

async function requireWorkspaceOwner(userId: string, ownerId: string) {
  const role = await getWorkspaceRole(userId, ownerId)

  if (role !== "owner") {
    throw new Error("FORBIDDEN_OWNER_REQUIRED")
  }
}

export async function leaveWorkspaceAction(): Promise<DangerousActionResult> {
  const user = await requireAuth()
  const ownerId = await getPrimaryWorkspace(user.id)

  if (ownerId === user.id) {
    throw new Error(
      "Владелец не может покинуть собственный workspace. Передайте права владельца или удалите workspace."
    )
  }

  const target = await getWorkspaceMemberByUser(user.id, ownerId, true)
  if (!target) {
    throw new Error("Вы не являетесь участником текущего workspace")
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("user_id", user.id)
    .eq("owner_id", ownerId)

  if (error) throw error

  await ensurePersonalWorkspace(user.id)

  revalidatePath("/settings/account")
  revalidatePath("/team")

  return {
    success: true,
    message: "Вы покинули workspace",
    redirectTo: "/dashboard",
  }
}

export async function transferWorkspaceOwnershipAction(
  input: z.infer<typeof TransferOwnershipSchema>
): Promise<DangerousActionResult> {
  const user = await requireAuth()
  const ownerId = await getPrimaryWorkspace(user.id)
  await requireWorkspaceOwner(user.id, ownerId)

  const parsed = TransferOwnershipSchema.parse(input)

  if (parsed.targetUserId === user.id) {
    throw new Error("Вы уже являетесь владельцем workspace")
  }

  const target = await getWorkspaceMemberByUser(parsed.targetUserId, ownerId)
  if (!target) {
    throw new Error("Новый владелец должен быть активным участником текущего workspace")
  }

  const { data: existingOwnedWorkspace, error: existingOwnedWorkspaceError } =
    await supabase
      .from("workspace_members")
      .select("id")
      .eq("user_id", parsed.targetUserId)
      .eq("owner_id", parsed.targetUserId)
      .maybeSingle()

  if (existingOwnedWorkspaceError) throw existingOwnedWorkspaceError
  if (existingOwnedWorkspace) {
    throw new Error(
      "Нельзя передать ownership пользователю, который уже владеет другим workspace"
    )
  }

  const { error } = await supabase.rpc("transfer_workspace_ownership", {
    p_old_owner_id: ownerId,
    p_new_owner_id: parsed.targetUserId,
  })

  if (error) throw error

  revalidatePath("/settings/account")
  revalidatePath("/team")

  return {
    success: true,
    message: "Права владельца переданы. Вы остались администратором workspace.",
    redirectTo: "/settings/account",
  }
}

export async function deactivateAccountAction(): Promise<DangerousActionResult> {
  const user = await requireAuth()

  const { data: ownedWorkspaces, error: ownedWorkspacesError } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("owner_id", user.id)
    .eq("status", "active")

  if (ownedWorkspacesError) throw ownedWorkspacesError
  if ((ownedWorkspaces ?? []).length > 0) {
    throw new Error(
      "Владелец workspace не может деактивировать аккаунт. Сначала передайте права владельца или удалите workspace."
    )
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({ status: "suspended", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "active")

  if (error) throw error

  revalidatePath("/settings/account")
  revalidatePath("/team")

  return {
    success: true,
    message: "Аккаунт деактивирован. Повторная активация выполняется администратором workspace.",
    redirectTo: "/login",
  }
}

export async function deleteWorkspaceAction(
  input: z.infer<typeof DeleteWorkspaceSchema>
): Promise<DangerousActionResult> {
  const user = await requireAuth()
  const ownerId = await getPrimaryWorkspace(user.id)
  await requireWorkspaceOwner(user.id, ownerId)

  const parsed = DeleteWorkspaceSchema.parse(input)
  const workspaceName = await getWorkspaceName(ownerId)
  const confirmation = parsed.confirmation.trim()

  if (confirmation !== workspaceName && confirmation !== "DELETE") {
    throw new Error(
      `Введите название workspace "${workspaceName}" или DELETE для подтверждения удаления`
    )
  }

  const { error: invitationsError } = await supabase
    .from("workspace_invitations")
    .delete()
    .eq("owner_id", ownerId)
  if (invitationsError) throw invitationsError

  const { error: domainsError } = await supabase
    .from("workspace_allowed_domains")
    .delete()
    .eq("owner_id", ownerId)
  if (domainsError) throw domainsError

  const { error: membersError } = await supabase
    .from("workspace_members")
    .delete()
    .eq("owner_id", ownerId)
  if (membersError) throw membersError

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ workspace_name: null, workspace_logo: null })
    .eq("id", ownerId)
  if (profileError) throw profileError

  const { error: settingsError } = await supabase
    .from("user_settings")
    .update({ workspace: {}, updated_at: new Date().toISOString() })
    .eq("user_id", ownerId)
  if (settingsError) throw settingsError

  await ensurePersonalWorkspace(user.id)

  revalidatePath("/settings/account")
  revalidatePath("/team")

  return {
    success: true,
    message: "Workspace удалён",
    redirectTo: "/dashboard",
  }
}
