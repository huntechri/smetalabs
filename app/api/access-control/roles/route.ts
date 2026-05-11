import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { roles, permissions, rolePermissions } from '@/db/schema/rbac'
import { eq } from 'drizzle-orm'

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
  try {
    // Получаем все роли
    const allRoles = await db
      .select({
        id: roles.id,
        name: roles.name,
        label: roles.label,
        locked: roles.locked,
        description: roles.description,
        createdAt: roles.createdAt,
      })
      .from(roles)
      .orderBy(roles.createdAt)

    // Получаем все role_permissions связи
    const allRolePerms = await db
      .select({
        roleId: rolePermissions.roleId,
        permissionId: rolePermissions.permissionId,
      })
      .from(rolePermissions)

    // Получаем все permissions
    const allPermissions = await db
      .select({
        id: permissions.id,
        key: permissions.key,
        label: permissions.label,
        groupName: permissions.groupName,
        description: permissions.description,
      })
      .from(permissions)

    // Строим карту permissionId → permission
    const permMap = new Map(
      allPermissions.map((p) => [p.id, p])
    )

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

    return NextResponse.json({
      data,
      meta: {
        total: data.length,
      },
    })
  } catch (error) {
    console.error('GET /api/access-control/roles error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ошибка при получении ролей',
        },
      },
      { status: 500 }
    )
  }
}
