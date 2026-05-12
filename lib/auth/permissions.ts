import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { supabase } from "@/db"
import {
  canManageTeamForWorkspace,
  requireCurrentWorkspace,
} from "@/lib/auth/team"

// ═══════════════════════════════════════════════════════════════
// 1. Базовые функции — role-based (обратная совместимость)
// ═══════════════════════════════════════════════════════════════

/**
 * Получить текущего пользователя из Supabase Auth.
 * Возвращает null если не аутентифицирован.
 */
async function getCurrentUserId(): Promise<string | null> {
  const client = await createSupabaseClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  return user?.id ?? null
}

/**
 * Получить роли текущего пользователя из user_roles.
 * Возвращает массив имён ролей (например, ["owner", "admin"]).
 *
 * Использует отдельные запросы + сборку в JS вместо Drizzle JOIN.
 */
export async function getUserRoles(): Promise<string[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  // 1. Получаем role_id для пользователя
  const { data: userRoleRows, error: err1 } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId)

  if (err1 || !userRoleRows?.length) return []

  const roleIds = userRoleRows.map((r) => r.role_id)

  // 2. Получаем имена ролей по id
  const { data: roleRows, error: err2 } = await supabase
    .from("roles")
    .select("name")
    .in("id", roleIds)

  if (err2) return []

  return roleRows.map((r) => r.name).filter(Boolean)
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
// 2. Permission-based функции (отдельные запросы + сборка в JS)
// ═══════════════════════════════════════════════════════════════

/**
 * Получить ВСЕ permissions текущего пользователя
 * через последовательные запросы: user_roles → role_permissions → permissions.
 *
 * Возвращает массив ключей разрешений (например, ["projects.read", "estimates.create"]).
 */
export async function getUserPermissions(): Promise<string[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  // 1. Получаем role_id для пользователя
  const { data: userRoleRows, error: err1 } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId)

  if (err1 || !userRoleRows?.length) return []

  const roleIds = userRoleRows.map((r) => r.role_id)

  // 2. Получаем permission_id через role_permissions
  const { data: rpRows, error: err2 } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .in("role_id", roleIds)

  if (err2 || !rpRows?.length) return []

  // Дедупликация permission_id
  const permissionIds = [...new Set(rpRows.map((r) => r.permission_id))]

  // 3. Получаем ключи разрешений
  const { data: permRows, error: err3 } = await supabase
    .from("permissions")
    .select("key")
    .in("id", permissionIds)

  if (err3) return []

  return permRows.map((r) => r.key)
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
    "projects.create",
    "projects.update",
    "projects.delete",
  ])
}

/**
 * Может ли пользователь управлять сметами?
 * (estimates.create || estimates.update || estimates.delete)
 */
export async function canManageEstimates(): Promise<boolean> {
  return hasAnyPermission([
    "estimates.create",
    "estimates.update",
    "estimates.delete",
  ])
}

/**
 * Может ли пользователь управлять командой?
 * (team.manage || team.create || team.update || team.delete)
 */
export async function canManageTeam(): Promise<boolean> {
  const userId = await getCurrentUserId()
  if (!userId) return false
  const ownerId = await requireCurrentWorkspace(userId)
  return canManageTeamForWorkspace(userId, ownerId)
}

/**
 * Может ли пользователь просматривать биллинг?
 */
export async function canViewBilling(): Promise<boolean> {
  return hasPermission("billing.read")
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
export async function requireAuth(): Promise<{
  id: string
  email?: string | null
}> {
  const client = await createSupabaseClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) {
    throw new Error("Unauthorized: требуется аутентификация")
  }
  return { id: user.id, email: user.email }
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
