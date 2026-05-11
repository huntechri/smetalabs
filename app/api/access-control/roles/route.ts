import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { roles, permissions, rolePermissions } from '@/db/schema/rbac'

/**
 * GET /api/access-control/roles
 *
 * Возвращает все роли с их разрешениями.
 * Только чтение — без 'use server'.
 *
 * Формат ответа:
 * {
 *   "data": [ { id, name, label, locked, description, permissions: [...] } ],
 *   "meta": { "total": 5 }
 * }
 */
export async function GET(_request: NextRequest) {
  // ── Step 0: Check DATABASE_URL ──
  if (!process.env.DATABASE_URL) {
    console.error('[GET /api/access-control/roles] DATABASE_URL is not set')
    return NextResponse.json(
      {
        error: {
          code: 'CONFIG_ERROR',
          message: 'DATABASE_URL не настроен',
        },
      },
      { status: 500 }
    )
  }

  console.log(
    `[GET /api/access-control/roles] DATABASE_URL present, host: ${new URL(process.env.DATABASE_URL).hostname}`
  )

  // ── Step 1: Fetch roles ──
  let allRoles
  try {
    allRoles = await db
      .select({
        id: roles.id,
        name: roles.name,
        label: roles.label,
        locked: roles.locked,
        description: roles.description,
        createdAt: roles.createdAt,
      })
      .from(roles)

    console.log(
      `[GET /api/access-control/roles] roles fetched: ${allRoles?.length ?? 0} rows`
    )
  } catch (err) {
    console.error('[GET /api/access-control/roles] roles query failed:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при загрузке ролей',
        },
      },
      { status: 500 }
    )
  }

  // ── Step 2: Fetch role_permissions ──
  let allRolePerms: Array<{ roleId: string; permissionId: string }>
  try {
    allRolePerms = await db
      .select({
        roleId: rolePermissions.roleId,
        permissionId: rolePermissions.permissionId,
      })
      .from(rolePermissions)

    console.log(
      `[GET /api/access-control/roles] rolePermissions fetched: ${allRolePerms?.length ?? 0} rows`
    )
  } catch (err) {
    console.error('[GET /api/access-control/roles] rolePermissions query failed:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при загрузке связей ролей и разрешений',
        },
      },
      { status: 500 }
    )
  }

  // ── Step 3: Fetch permissions ──
  let allPermissions
  try {
    allPermissions = await db
      .select({
        id: permissions.id,
        key: permissions.key,
        label: permissions.label,
        groupName: permissions.groupName,
        description: permissions.description,
      })
      .from(permissions)

    console.log(
      `[GET /api/access-control/roles] permissions fetched: ${allPermissions?.length ?? 0} rows`
    )
  } catch (err) {
    console.error('[GET /api/access-control/roles] permissions query failed:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при загрузке разрешений',
        },
      },
      { status: 500 }
    )
  }

  // ── Step 4: Build response ──
  try {
    // Строим карту permissionId → permission
    const permMap = new Map(allPermissions.map((p) => [p.id, p]))

    // Группируем rolePermissions по roleId
    const rolePermMap = new Map<string, string[]>()
    for (const rp of allRolePerms) {
      const existing = rolePermMap.get(rp.roleId) ?? []
      existing.push(rp.permissionId)
      rolePermMap.set(rp.roleId, existing)
    }

    // Собираем результат
    const data = allRoles.map((role) => {
      const permIds = rolePermMap.get(role.id) ?? []
      const perms = permIds
        .map((pid) => permMap.get(pid))
        .filter(Boolean)
        .map((p) => ({
          id: p!.id,
          key: p!.key,
          label: p!.label,
          groupName: p!.groupName,
          description: p!.description,
        }))

      return {
        ...role,
        permissions: perms,
      }
    })

    console.log(
      `[GET /api/access-control/roles] response built: ${data.length} roles`
    )

    return NextResponse.json({
      data,
      meta: {
        total: data.length,
      },
    })
  } catch (err) {
    console.error('[GET /api/access-control/roles] response building failed:', err)
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
