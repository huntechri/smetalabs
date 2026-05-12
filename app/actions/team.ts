"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { requireAuth } from "@/lib/auth/permissions"
import { supabase } from "@/db"
import {
  canManageTeamForWorkspace,
  getPrimaryWorkspace,
  getRoleId,
} from "@/lib/auth/team"

const InviteMemberSchema = z.object({
  email: z.string().email("Некорректный email"),
  role: z.enum(["admin", "manager", "estimator", "viewer"]),
  message: z.string().optional(),
})

const TransferOwnershipSchema = z.object({
  userId: z.string().min(1, "Некорректный ID пользователя"),
})

async function getUserName(userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle()
    return data?.full_name ?? "System"
  } catch {
    return "System"
  }
}

async function getRequestOrigin() {
  const headersList = await headers()
  const forwardedHost = headersList.get("x-forwarded-host")
  const host = forwardedHost ?? headersList.get("host") ?? "localhost:3000"
  const proto = headersList.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

function authCallbackUrl(origin: string) {
  return `${origin}/auth/callback`
}

export async function inviteMemberAction(input: z.infer<typeof InviteMemberSchema>) {
  const user = await requireAuth()
  const parsed = InviteMemberSchema.parse({
    ...input,
    email: input.email.trim().toLowerCase(),
  })

  const ownerId = await getPrimaryWorkspace(user.id)
  if (!(await canManageTeamForWorkspace(user.id, ownerId))) {
    throw new Error("Forbidden: недостаточно прав для приглашения участников")
  }

  const roleId = await getRoleId(parsed.role)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invitation, error: insertError } = await supabase
    .from("workspace_invitations")
    .insert({
      email: parsed.email,
      role_id: roleId,
      invited_by: user.id,
      owner_id: ownerId,
      message: parsed.message ?? null,
      expires_at: expiresAt,
    })
    .select("id,email,message,invited_at,expires_at,status")
    .single()

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error("Приглашение для этого email уже отправлено")
    }
    throw new Error(`Ошибка создания приглашения: ${insertError.message}`)
  }

  const origin = await getRequestOrigin()
  const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(parsed.email, {
    redirectTo: authCallbackUrl(origin),
    data: {
      invited_by: user.id,
      workspace_role: parsed.role,
      invitation_id: invitation.id,
    },
  })

  if (inviteErr) {
    await supabase
      .from("workspace_invitations")
      .delete()
      .eq("id", invitation.id)
      .eq("owner_id", ownerId)
    throw new Error(`Ошибка отправки приглашения: ${inviteErr.message}`)
  }

  const inviterName = await getUserName(user.id)
  const result = {
    id: invitation.id,
    email: invitation.email,
    role: parsed.role,
    invitedBy: inviterName,
    invitedAt: invitation.invited_at,
    expiresAt: invitation.expires_at,
    status: invitation.status,
    message: invitation.message ?? "",
  }

  revalidatePath("/team")
  return { success: true, data: result, emailSent: true }
}

export async function leaveWorkspaceAction() {
  await requireAuth()
  throw new Error("Not implemented: безопасный выход из workspace ещё не подключён")
}

export async function transferOwnershipAction(input: z.infer<typeof TransferOwnershipSchema>) {
  await requireAuth()
  TransferOwnershipSchema.parse(input)
  throw new Error("Not implemented: передача владельца требует отдельной транзакционной операции")
}

export async function deactivateAccountAction() {
  await requireAuth()
  throw new Error("Not implemented: деактивация аккаунта пока не подключена")
}
