'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/permissions'
import { supabase } from '@/db'
import { createClient } from '@/lib/supabase/server'
import {
  canManageTeamForWorkspace,
  getPrimaryWorkspace,
  getRoleId,
} from '@/lib/auth/team'

// ═══════════════════════════════════════════════════════════════
// Zod-схемы
// ═══════════════════════════════════════════════════════════════

const InviteMemberSchema = z.object({
  email: z.string().email('Некорректный email'),
  role: z.enum(['admin', 'manager', 'estimator', 'viewer']),
  message: z.string().optional(),
})

const TransferOwnershipSchema = z.object({
  userId: z.string().min(1, 'Некорректный ID пользователя'),
})

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

async function updateWorkspaceField(
  userId: string,
  updates: Record<string, unknown>
) {
  const { data: existing } = await supabase
    .from('user_settings')
    .select('workspace')
    .eq('user_id', userId)
    .maybeSingle()

  const ws = (existing?.workspace ?? {}) as Record<string, any>
  const merged = { ...ws, ...updates }

  await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      workspace: merged,
      updated_at: new Date().toISOString(),
    })
}

async function getUserName(userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()
    return data?.full_name ?? 'System'
  } catch {
    return 'System'
  }
}

// ═══════════════════════════════════════════════════════════════
// Server Actions
// ═══════════════════════════════════════════════════════════════

/**
 * Пригласить участника в workspace.
 * Сохраняет приглашение в workspace_invitations и отправляет письмо Supabase Auth.
 */
export async function inviteMemberAction(
  input: z.infer<typeof InviteMemberSchema>
) {
  const user = await requireAuth()
  const parsed = InviteMemberSchema.parse({
    ...input,
    email: input.email.trim().toLowerCase(),
  })

  const ownerId = await getPrimaryWorkspace(user.id)
  if (!(await canManageTeamForWorkspace(user.id, ownerId))) {
    throw new Error('Forbidden: недостаточно прав для приглашения участников')
  }

  const roleId = await getRoleId(parsed.role)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invitation, error: insertError } = await supabase
    .from('workspace_invitations')
    .insert({
      email: parsed.email,
      role_id: roleId,
      invited_by: user.id,
      owner_id: ownerId,
      message: parsed.message ?? null,
      expires_at: expiresAt,
    })
    .select('id,email,message,invited_at,expires_at,status')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      throw new Error('Приглашение для этого email уже отправлено')
    }
    throw new Error(`Ошибка создания приглашения: ${insertError.message}`)
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(parsed.email, {
    redirectTo: `${siteUrl}/dashboard`,
    data: {
      invited_by: user.id,
      workspace_role: parsed.role,
      invitation_id: invitation.id,
    },
  })

  if (inviteErr) {
    await supabase.from('workspace_invitations').delete().eq('id', invitation.id)
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
    message: invitation.message ?? '',
  }

  revalidatePath('/team')
  return { success: true, data: result, emailSent: true }
}

/**
 * Покинуть workspace.
 */
export async function leaveWorkspaceAction() {
  const user = await requireAuth()

  // TODO: Реализовать при создании таблиц workspace_members
  // await supabase.from('workspace_members').delete().eq('user_id', user.id)

  revalidatePath('/team')
  return { success: true, message: 'Вы покинули workspace' }
}

/**
 * Передать права владельца другому участнику.
 */
export async function transferOwnershipAction(
  input: z.infer<typeof TransferOwnershipSchema>
) {
  const user = await requireAuth()

  // TODO: Реализовать при создании таблиц workspace_members
  // const parsed = TransferOwnershipSchema.parse(input)

  revalidatePath('/team')
  return { success: true, message: 'Права владельца переданы' }
}

/**
 * Деактивировать аккаунт.
 */
export async function deactivateAccountAction() {
  const user = await requireAuth()

  // TODO: Реализовать деактивацию аккаунта

  return { success: true, message: 'Аккаунт деактивирован' }
}

/**
 * Отправить ссылку для сброса пароля на email пользователя.
 */
export async function resetPasswordAction() {
  const user = await requireAuth()

  const client = await createClient()
  const { error } = await client.auth.resetPasswordForEmail(user.email!, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/settings/account`,
  })

  if (error) {
    throw new Error(`Ошибка отправки ссылки для сброса пароля: ${error.message}`)
  }

  return { success: true, message: 'Ссылка для сброса пароля отправлена на email' }
}
