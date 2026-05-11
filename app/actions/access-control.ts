'use server'

import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { roles, userRoles } from '@/db/schema/rbac'
import { canManageTeam, requireAuth } from '@/lib/auth/permissions'

// ── Zod schemas ──

const AssignRoleSchema = z.object({
  userId: z.string().uuid('Некорректный ID пользователя'),
  roleId: z.string().uuid('Некорректный ID роли'),
})

const RemoveRoleSchema = z.object({
  userId: z.string().uuid('Некорректный ID пользователя'),
  roleId: z.string().uuid('Некорректный ID роли'),
})

// ── assignRole ──

export async function assignRole(
  input: z.infer<typeof AssignRoleSchema>
) {
  const user = await requireAuth()

  // Проверка прав: только owner / admin могут назначать роли
  if (!(await canManageTeam())) {
    throw new Error('Forbidden: недостаточно прав для назначения ролей')
  }

  const parsed = AssignRoleSchema.parse(input)

  // Проверяем, существует ли уже такая связь
  const existing = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, parsed.userId),
        eq(userRoles.roleId, parsed.roleId)
      )
    )
    .then((r) => r[0])

  if (existing) {
    return { success: true, message: 'Роль уже назначена' }
  }

  await db.insert(userRoles).values({
    userId: parsed.userId,
    roleId: parsed.roleId,
    assignedBy: user.id,
  })

  revalidatePath('/team')
  revalidatePath('/settings/access')

  return { success: true, message: 'Роль назначена' }
}

// ── removeRole ──

export async function removeRole(
  input: z.infer<typeof RemoveRoleSchema>
) {
  const user = await requireAuth()

  // Проверка прав
  if (!(await canManageTeam())) {
    throw new Error('Forbidden: недостаточно прав для снятия ролей')
  }

  const parsed = RemoveRoleSchema.parse(input)

  // Проверяем, не заблокирована ли роль (locked = true)
  const role = await db
    .select({ name: roles.name, locked: roles.locked })
    .from(roles)
    .where(eq(roles.id, parsed.roleId))
    .then((r) => r[0])

  if (!role) {
    throw new Error('Роль не найдена')
  }

  if (role.locked) {
    throw new Error(`Нельзя снять заблокированную роль: ${role.name}`)
  }

  // Нельзя снять роль у самого себя
  if (parsed.userId === user.id) {
    throw new Error('Нельзя изменить свою собственную роль')
  }

  await db
    .delete(userRoles)
    .where(
      and(
        eq(userRoles.userId, parsed.userId),
        eq(userRoles.roleId, parsed.roleId)
      )
    )

  revalidatePath('/team')
  revalidatePath('/settings/access')

  return { success: true, message: 'Роль снята' }
}
