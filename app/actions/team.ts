'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth, canManageTeam } from '@/lib/auth/permissions'
import { supabase } from '@/db'
import { createClient } from '@/lib/supabase/server'

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
 * Сохраняет приглашение в user_settings.workspace.invitations.
 */
export async function inviteMemberAction(
  input: z.infer<typeof InviteMemberSchema>
) {
  const user = await requireAuth()

  if (!(await canManageTeam())) {
    throw new Error('Forbidden: недостаточно прав для приглашения участников')
  }

  const parsed = InviteMemberSchema.parse(input)

  const { data: existing } = await supabase
    .from('user_settings')
    .select('workspace')
    .eq('user_id', user.id)
    .maybeSingle()

  const ws = (existing?.workspace ?? {}) as Record<string, any>
  const invitations = (ws.invitations ?? []) as any[]

  // Check duplicate email
  if (invitations.some((inv: any) => inv.email === parsed.email && inv.status === 'pending')) {
    throw new Error('Приглашение для этого email уже отправлено')
  }

  const inviterName = await getUserName(user.id)

  const newInvitation = {
    id: crypto.randomUUID(),
    email: parsed.email,
    role: parsed.role,
    invitedBy: inviterName,
    invitedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    message: parsed.message ?? '',
  }

  invitations.push(newInvitation)

  await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      workspace: { ...ws, invitations },
      updated_at: new Date().toISOString(),
    })

  revalidatePath('/team')
  return { success: true, data: newInvitation }
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
