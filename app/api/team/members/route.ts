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
  // ── Step 1: Auth check ──
  let supabase
  try {
    supabase = await createClient()
  } catch (err) {
    console.error('[GET /api/team/members] createClient failed:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при создании клиента',
        },
      },
      { status: 500 }
    )
  }

  let user
  try {
    const result = await supabase.auth.getUser()
    user = result.data?.user ?? null
    if (result.error) {
      console.error('[GET /api/team/members] getUser returned error:', result.error)
    }
  } catch (err) {
    console.error('[GET /api/team/members] getUser threw:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при проверке аутентификации',
        },
      },
      { status: 500 }
    )
  }

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

  // ── Step 2: Fetch profiles ──
  let allProfiles
  try {
    allProfiles = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        phone: profiles.phone,
        position: profiles.position,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
    console.log(
      `[GET /api/team/members] profiles fetched: ${allProfiles?.length ?? 0} rows`
    )
  } catch (err) {
    console.error('[GET /api/team/members] profiles query failed:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при загрузке профилей',
        },
      },
      { status: 500 }
    )
  }

  // ── Step 3: Fetch user_roles + roles join ──
  let allUserRoles
  try {
    allUserRoles = await db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        roleName: roles.name,
        roleLabel: roles.label,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
    console.log(
      `[GET /api/team/members] userRoles fetched: ${allUserRoles?.length ?? 0} rows`
    )
  } catch (err) {
    console.error('[GET /api/team/members] userRoles join query failed:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при загрузке ролей пользователей',
        },
      },
      { status: 500 }
    )
  }

  // ── Step 4: Build response ──
  try {
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

    const data = allProfiles.map((profile) => {
      const profileRoles = userRoleMap.get(profile.id) ?? []
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
        email: null,
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
        status: 'active',
        joinedAt: profile.createdAt,
      }
    })

    console.log(
      `[GET /api/team/members] response built: ${data.length} members`
    )

    return NextResponse.json({
      data,
      meta: {
        total: data.length,
      },
    })
  } catch (err) {
    console.error('[GET /api/team/members] response building failed:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при формировании ответа',
        },
      },
      { status: 500 }
    )
  }
}
