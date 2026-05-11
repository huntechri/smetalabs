'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { supabase } from '@/db'
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
  const { data: existing, error: checkErr } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('user_id', parsed.userId)
    .eq('role_id', parsed.roleId)

  if (checkErr) {
    console.error('[assignRole] check existing failed:', checkErr)
    throw new Error('Ошибка при проверке существующей роли')
  }

  if (existing && existing.length > 0) {
    return { success: true, message: 'Роль уже назначена' }
  }

  const { error: insertErr } = await supabase
    .from('user_roles')
    .insert({
      user_id: parsed.userId,
      role_id: parsed.roleId,
      assigned_by: user.id,
    })

  if (insertErr) {
    console.error('[assignRole] insert failed:', insertErr)
    throw new Error('Ошибка при назначении роли')
  }

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
  const { data: roleData, error: roleErr } = await supabase
    .from('roles')
    .select('name, locked')
    .eq('id', parsed.roleId)

  if (roleErr) {
    console.error('[removeRole] roles query failed:', roleErr)
    throw new Error('Ошибка при проверке роли')
  }

  const role = roleData?.[0]

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

  const { error: deleteErr } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', parsed.userId)
    .eq('role_id', parsed.roleId)

  if (deleteErr) {
    console.error('[removeRole] delete failed:', deleteErr)
    throw new Error('Ошибка при снятии роли')
  }

  revalidatePath('/team')
  revalidatePath('/settings/access')

  return { success: true, message: 'Роль снята' }
}
