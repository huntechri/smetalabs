import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabase } from '@/db'

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
  // ── Step 1: Auth check (через SSR-клиент с cookies) ──
  let ssrClient
  try {
    ssrClient = await createClient()
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
    const result = await ssrClient.auth.getUser()
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

  // ── Step 2: Fetch profiles (service_role bypasses RLS) ──
  let allProfiles
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, phone, position, created_at')

    if (error) throw error
    allProfiles = data ?? []

    console.log(
      `[GET /api/team/members] profiles fetched: ${allProfiles.length} rows`
    )
  } catch (err: any) {
    console.error('[GET /api/team/members] profiles query failed:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при загрузке профилей',
          details: err?.message,
        },
      },
      { status: 500 }
    )
  }

  // ── Step 3: Fetch user_roles + roles (отдельные запросы + сборка в JS) ──
  let allUserRoles
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role_id')

    if (error) throw error
    allUserRoles = (data ?? []) as Array<{ user_id: string; role_id: string }>

    console.log(
      `[GET /api/team/members] user_roles fetched: ${allUserRoles.length} rows`
    )
  } catch (err: any) {
    console.error('[GET /api/team/members] user_roles query failed:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при загрузке ролей пользователей',
          details: err?.message,
        },
      },
      { status: 500 }
    )
  }

  // Fetch all roles to resolve role_id → name/label
  let rolesMap: Map<string, { name: string; label: string }>
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, label')

    if (error) throw error

    rolesMap = new Map(
      (data ?? []).map((r: any) => [r.id, { name: r.name, label: r.label }])
    )
  } catch (err: any) {
    console.error('[GET /api/team/members] roles query failed:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при загрузке ролей',
          details: err?.message,
        },
      },
      { status: 500 }
    )
  }

  // ── Step 4: Fetch workspace member statuses (если таблица уже используется) ──
  let workspaceMemberMap = new Map<
    string,
    { status: string; role_id: string | null; joined_at: string | null; last_active_at: string | null }
  >()
  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('user_id, role_id, status, joined_at, last_active_at')

    if (error) throw error

    workspaceMemberMap = new Map(
      (data ?? []).map((m: any) => [
        m.user_id,
        {
          status: m.status,
          role_id: m.role_id,
          joined_at: m.joined_at,
          last_active_at: m.last_active_at,
        },
      ])
    )
  } catch (err: any) {
    console.warn('[GET /api/team/members] workspace_members unavailable:', err?.message ?? err)
  }

  // ── Step 5: Build response (JS assembly) ──
  try {
    const userRoleMap = new Map<
      string,
      Array<{ roleId: string; name: string; label: string }>
    >()
    for (const ur of allUserRoles) {
      const roleInfo = rolesMap.get(ur.role_id)
      if (!roleInfo) continue

      const existing = userRoleMap.get(ur.user_id) ?? []
      existing.push({
        roleId: ur.role_id,
        name: roleInfo.name,
        label: roleInfo.label,
      })
      userRoleMap.set(ur.user_id, existing)
    }

    const rolePriority: Record<string, number> = {
      owner: 0,
      admin: 1,
      manager: 2,
      estimator: 3,
      viewer: 4,
    }

    const data = allProfiles
      .filter((profile: any) => userRoleMap.has(profile.id) || workspaceMemberMap.has(profile.id))
      .map((profile: any) => {
        const workspaceMember = workspaceMemberMap.get(profile.id)
        const profileRoles = userRoleMap.get(profile.id) ?? []

        if (workspaceMember?.role_id && !profileRoles.some((r) => r.roleId === workspaceMember.role_id)) {
          const roleInfo = rolesMap.get(workspaceMember.role_id)
          if (roleInfo) {
            profileRoles.push({
              roleId: workspaceMember.role_id,
              name: roleInfo.name,
              label: roleInfo.label,
            })
          }
        }

        const sorted = [...profileRoles].sort(
          (a, b) => (rolePriority[a.name] ?? 99) - (rolePriority[b.name] ?? 99)
        )

        return {
          id: profile.id,
          name: profile.full_name ?? 'Без имени',
          email: null,
          avatarUrl: profile.avatar_url,
          phone: profile.phone,
          position: profile.position,
          primaryRole: sorted[0]?.name ?? null,
          primaryRoleLabel: sorted[0]?.label ?? null,
          roles: profileRoles.map((r) => ({
            id: r.roleId,
            name: r.name,
            label: r.label,
          })),
          status: workspaceMember?.status ?? 'active',
          joinedAt: workspaceMember?.joined_at ?? profile.created_at,
          lastActiveAt: workspaceMember?.last_active_at ?? null,
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
  } catch (err: any) {
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
