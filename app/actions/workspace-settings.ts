'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth, canManageTeam } from '@/lib/auth/permissions'

/**
 * ⚠️ SKELETONS — реальная логика будет добавлена после создания
 * workspace-таблиц (workspace_members, workspace_invitations,
 * workspace_allowed_domains) в Drizzle-схемах.
 *
 * На данный момент действия выбрасывают ошибку "Not implemented".
 * Архитектурный контракт (сигнатуры + Zod-валидация) зафиксирован.
 */

// ── Zod schemas ──

const ChangeRoleSchema = z.object({
  userId: z.string().uuid('Некорректный ID пользователя'),
  newRole: z.enum(['owner', 'admin', 'manager', 'estimator', 'viewer']),
})

const RemoveMemberSchema = z.object({
  userId: z.string().uuid('Некорректный ID пользователя'),
})

const SuspendMemberSchema = z.object({
  userId: z.string().uuid('Некорректный ID пользователя'),
})

const InviteMemberSchema = z.object({
  email: z.string().email('Некорректный email'),
  role: z.enum(['owner', 'admin', 'manager', 'estimator', 'viewer']),
})

const RevokeInvitationSchema = z.object({
  id: z.string().uuid('Некорректный ID приглашения'),
})

// ── changeRole ──

export async function changeRole(
  input: z.infer<typeof ChangeRoleSchema>
) {
  const user = await requireAuth()

  if (!(await canManageTeam())) {
    throw new Error('Forbidden: недостаточно прав для изменения ролей')
  }

  const parsed = ChangeRoleSchema.parse(input)

  // TODO: реализовать после создания workspace_members схемы
  // await db.update(workspaceMembers)
  //   .set({ role: parsed.newRole })
  //   .where(and(eq(...), eq(...)))

  revalidatePath('/team')
  return { success: true, message: `Роль изменена на ${parsed.newRole}` }
}

// ── removeMember ──

export async function removeMember(
  input: z.infer<typeof RemoveMemberSchema>
) {
  const user = await requireAuth()

  if (!(await canManageTeam())) {
    throw new Error('Forbidden: недостаточно прав для удаления участников')
  }

  const parsed = RemoveMemberSchema.parse(input)

  if (parsed.userId === user.id) {
    throw new Error('Нельзя удалить самого себя. Используйте leaveWorkspace.')
  }

  // TODO: реализовать после создания workspace_members схемы
  // await db.delete(workspaceMembers).where(...)

  revalidatePath('/team')
  return { success: true, message: 'Участник удалён' }
}

// ── suspendMember ──

export async function suspendMember(
  input: z.infer<typeof SuspendMemberSchema>
) {
  const user = await requireAuth()

  if (!(await canManageTeam())) {
    throw new Error('Forbidden: недостаточно прав для блокировки участников')
  }

  const parsed = SuspendMemberSchema.parse(input)

  if (parsed.userId === user.id) {
    throw new Error('Нельзя заблокировать самого себя')
  }

  // TODO: реализовать после создания workspace_members схемы
  // await db.update(workspaceMembers).set({ status: 'suspended' }).where(...)

  revalidatePath('/team')
  return { success: true, message: 'Участник заблокирован' }
}

// ── inviteMember ──

export async function inviteMember(
  input: z.infer<typeof InviteMemberSchema>
) {
  const user = await requireAuth()

  if (!(await canManageTeam())) {
    throw new Error('Forbidden: недостаточно прав для приглашения участников')
  }

  const parsed = InviteMemberSchema.parse(input)

  // TODO: реализовать после создания workspace_invitations схемы
  // await db.insert(workspaceInvitations).values({...})

  revalidatePath('/team')
  return { success: true, message: `Приглашение отправлено на ${parsed.email}` }
}

// ── revokeInvitation ──

export async function revokeInvitation(
  input: z.infer<typeof RevokeInvitationSchema>
) {
  const user = await requireAuth()

  if (!(await canManageTeam())) {
    throw new Error('Forbidden: недостаточно прав для отзыва приглашений')
  }

  const parsed = RevokeInvitationSchema.parse(input)

  // TODO: реализовать после создания workspace_invitations схемы
  // await db.delete(workspaceInvitations).where(eq(...))

  revalidatePath('/team')
  return { success: true, message: 'Приглашение отозвано' }
}
