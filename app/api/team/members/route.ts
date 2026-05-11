import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { userRoles, roles } from '@/db/schema/rbac'
import { profiles } from '@/db/schema/profiles'
import { eq } from 'drizzle-orm'

/**
 * GET /api/team/members
 *
 * Возвращает список участников workspace с ролями и статусами.
 * Только чтение — без 'use server'.
 *
 * Формат ответа:
 * {
 *   "data": [ { id, name, email, avatarUrl, roles: [...], status, ... } ],
 *   "meta": { "total": N }
 * }
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Требуется аутентификация',
          },
        },
        { status: 401 }
      )
    }

    // Получаем все профили (участники workspace)
    const allProfiles = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        phone: profiles.phone,
        position: profiles.position,
        createdAt: profiles.createdAt,
      })
      .from(profiles)

    // Получаем все user_roles с именами ролей
    const allUserRoles = await db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        roleName: roles.name,
        roleLabel: roles.label,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))

    // Группируем роли по userId
    const userRoleMap = new Map<
      string,
      Array<{ roleId: string; name: string; label: string }>
    >()
    for (const ur of allUserRoles) {
      const existing = userRoleMap.get(ur.userId) ?? []
      existing.push({
        roleId: ur.roleId,
        name: ur.roleName,
        label: ur.roleLabel,
      })
      userRoleMap.set(ur.userId, existing)
    }

    // Собираем результат: профили + роли
    const data = allProfiles.map((profile) => {
      const profileRoles = userRoleMap.get(profile.id) ?? []
      // Определяем основную роль (первая или с наивысшим приоритетом)
      const rolePriority: Record<string, number> = {
        owner: 0,
        admin: 1,
        manager: 2,
        estimator: 3,
        viewer: 4,
      }
      const sorted = [...profileRoles].sort(
        (a, b) => (rolePriority[a.name] ?? 99) - (rolePriority[b.name] ?? 99)
      )

      return {
        id: profile.id,
        name: profile.fullName ?? 'Без имени',
        email: null, // email берётся из auth.users (не хранится в profiles)
        avatarUrl: profile.avatarUrl,
        phone: profile.phone,
        position: profile.position,
        primaryRole: sorted[0]?.name ?? null,
        primaryRoleLabel: sorted[0]?.label ?? null,
        roles: profileRoles.map((r) => ({
          id: r.roleId,
          name: r.name,
          label: r.label,
        })),
        status: 'active', // TODO: брать из workspace_members.status
        joinedAt: profile.createdAt,
      }
    })

    return NextResponse.json({
      data,
      meta: {
        total: data.length,
      },
    })
  } catch (error) {
    console.error('GET /api/team/members error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при получении списка участников',
        },
      },
      { status: 500 }
    )
  }
}
