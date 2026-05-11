import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { db } from '@/db'
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
} from '@/db/schema/rbac'
import { eq, and, inArray } from 'drizzle-orm'

// ═══════════════════════════════════════════════════════════════
// 1. Базовые функции — role-based (обратная совместимость)
// ═══════════════════════════════════════════════════════════════

/**
 * Получить текущего пользователя из Supabase Auth.
 * Возвращает null если не аутентифицирован.
 */
async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Получить роли текущего пользователя из user_roles.
 * Возвращает массив имён ролей (например, ["owner", "admin"]).
 */
export async function getUserRoles(): Promise<string[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const userRoleRows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId))

  return userRoleRows.map((r) => r.name).filter(Boolean)
}

/**
 * Проверить, есть ли у текущего пользователя конкретная роль.
 */
export async function hasRole(role: string): Promise<boolean> {
  const userRolesList = await getUserRoles()
  return userRolesList.includes(role)
}

/**
 * Проверить, есть ли у текущего пользователя хотя бы одна из указанных ролей.
 */
export async function hasAnyRole(rolesList: string[]): Promise<boolean> {
  const userRolesList = await getUserRoles()
  return rolesList.some((r) => userRolesList.includes(r))
}

// ═══════════════════════════════════════════════════════════════
// 2. Permission-based функции (Drizzle JOIN)
// ═══════════════════════════════════════════════════════════════

/**
 * Получить ВСЕ permissions текущего пользователя
 * через Drizzle JOIN: user_roles → role_permissions → permissions.
 *
 * Возвращает массив ключей разрешений (например, ["projects.read", "estimates.create"]).
 */
export async function getUserPermissions(): Promise<string[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const rows = await db
    .selectDistinct({ key: permissions.key })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId))

  return rows.map((r) => r.key)
}

let _cachedPermissions: string[] | null = null
let _cachedUserId: string | null = null

/**
 * Получить закэшированные permissions (для повторных проверок в рамках одного запроса).
 */
async function getCachedPermissions(): Promise<string[]> {
  const userId = await getCurrentUserId()
  if (userId === _cachedUserId && _cachedPermissions !== null) {
    return _cachedPermissions
  }
  _cachedPermissions = await getUserPermissions()
  _cachedUserId = userId
  return _cachedPermissions
}

/**
 * Проверить, есть ли у текущего пользователя конкретное разрешение.
 */
export async function hasPermission(key: string): Promise<boolean> {
  const perms = await getCachedPermissions()
  return perms.includes(key)
}

/**
 * Проверить, есть ли у текущего пользователя хотя бы одно из указанных разрешений.
 */
export async function hasAnyPermission(keys: string[]): Promise<boolean> {
  const perms = await getCachedPermissions()
  return keys.some((k) => perms.includes(k))
}

/**
 * Проверить, есть ли у текущего пользователя ВСЕ указанные разрешения.
 */
export async function hasAllPermissions(keys: string[]): Promise<boolean> {
  const perms = await getCachedPermissions()
  return keys.every((k) => perms.includes(k))
}

// ═══════════════════════════════════════════════════════════════
// 3. Семантические проверки (доменные)
// ═══════════════════════════════════════════════════════════════

/**
 * Может ли пользователь управлять проектами?
 * (projects.create || projects.update || projects.delete)
 */
export async function canManageProjects(): Promise<boolean> {
  return hasAnyPermission([
    'projects.create',
    'projects.update',
    'projects.delete',
  ])
}

/**
 * Может ли пользователь управлять сметами?
 * (estimates.create || estimates.update || estimates.delete)
 */
export async function canManageEstimates(): Promise<boolean> {
  return hasAnyPermission([
    'estimates.create',
    'estimates.update',
    'estimates.delete',
  ])
}

/**
 * Может ли пользователь управлять командой?
 * (team.manage || team.create || team.update || team.delete)
 */
export async function canManageTeam(): Promise<boolean> {
  return hasAnyPermission([
    'team.manage',
    'team.create',
    'team.update',
    'team.delete',
  ])
}

/**
 * Может ли пользователь просматривать биллинг?
 */
export async function canViewBilling(): Promise<boolean> {
  return hasPermission('billing.read')
}

/**
 * Может ли пользователь писать (создавать/редактировать/удалять)?
 * Обратная совместимость: canWrite = canManageProjects || canManageEstimates
 */
export async function canWrite(): Promise<boolean> {
  const [projects, estimates] = await Promise.all([
    canManageProjects(),
    canManageEstimates(),
  ])
  return projects || estimates
}

// ═══════════════════════════════════════════════════════════════
// 4. Guard-функции (бросают ошибку при отсутствии прав)
// ═══════════════════════════════════════════════════════════════

/**
 * Требовать аутентификацию. Бросает Error если нет сессии.
 * Возвращает user.id.
 */
export async function requireAuth(): Promise<{ id: string }> {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('Unauthorized: требуется аутентификация')
  }
  return { id: userId }
}

/**
 * Требовать конкретное разрешение. Бросает Error если нет прав.
 */
export async function requirePermission(key: string): Promise<void> {
  await requireAuth()
  const has = await hasPermission(key)
  if (!has) {
    throw new Error(`Forbidden: отсутствует разрешение "${key}"`)
  }
}

/**
 * Требовать определённую роль. Бросает Error если нет роли.
 * (обратная совместимость)
 */
export async function requireRole(role: string): Promise<void> {
  await requireAuth()
  const has = await hasRole(role)
  if (!has) {
    throw new Error(`Forbidden: недостаточно прав (требуется роль "${role}")`)
  }
}
