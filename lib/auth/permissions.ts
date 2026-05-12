import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { supabase } from "@/db"
import {
  canManageTeamForWorkspace,
  getPrimaryWorkspace,
  getWorkspaceRole,
  requireCurrentWorkspace,
  requireWorkspaceMember,
} from "@/lib/auth/team"

// ═══════════════════════════════════════════════════════════════
// 1. Базовые функции — workspace-scoped compatibility wrappers
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

async function getCurrentWorkspaceRoleIds(): Promise<string[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const ownerId = await getPrimaryWorkspace(userId)
  const member = await requireWorkspaceMember(userId, ownerId)
  return member.roleId ? [member.roleId] : []
}

/**
 * @deprecated Ambiguous compatibility helper. Workspace authorization must use
 * explicit ownerId helpers from `lib/auth/team` when possible. This wrapper is
 * intentionally scoped to the current workspace and never reads global
 * `user_roles`.
 */
export async function getUserRoles(): Promise<string[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const role = await getWorkspaceRole(userId, await getPrimaryWorkspace(userId))
  return role ? [role] : []
}

/**
 * @deprecated Ambiguous compatibility helper. Prefer explicit workspace checks
 * from `lib/auth/team`. This wrapper uses current workspace membership only.
 */
export async function hasRole(role: string): Promise<boolean> {
  const userRolesList = await getUserRoles()
  return userRolesList.includes(role)
}

/**
 * @deprecated Ambiguous compatibility helper. Prefer explicit workspace checks
 * from `lib/auth/team`. This wrapper uses current workspace membership only.
 */
export async function hasAnyRole(rolesList: string[]): Promise<boolean> {
  const userRolesList = await getUserRoles()
  return rolesList.some((r) => userRolesList.includes(r))
}

// ═══════════════════════════════════════════════════════════════
// 2. Permission-based функции (workspace_members → role_permissions → permissions)
// ═══════════════════════════════════════════════════════════════

/**
 * @deprecated Ambiguous compatibility helper. Workspace authorization must use
 * explicit ownerId helpers from `lib/auth/team` when possible. This wrapper
 * resolves the current workspace and derives permissions from
 * `workspace_members.role_id`, never from global `user_roles`.
 */
export async function getUserPermissions(): Promise<string[]> {
  const roleIds = await getCurrentWorkspaceRoleIds()
  if (!roleIds.length) return []

  // 1. Получаем permission_id через role_permissions
  const { data: rpRows, error: err2 } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .in("role_id", roleIds)

  if (err2 || !rpRows?.length) return []

  // Дедупликация permission_id
  const permissionIds = [...new Set(rpRows.map((r) => r.permission_id))]

  // 2. Получаем ключи разрешений
  const { data: permRows, error: err3 } = await supabase
    .from("permissions")
    .select("key")
    .in("id", permissionIds)

  if (err3) return []

  return permRows.map((r) => r.key)
}

let _cachedPermissions: string[] | null = null
let _cachedPermissionsScope: string | null = null

/**
 * Получить закэшированные permissions (для повторных проверок в рамках одного запроса).
 */
async function getCachedPermissions(): Promise<string[]> {
  const userId = await getCurrentUserId()
  const ownerId = userId ? await getPrimaryWorkspace(userId) : null
  const scope = userId && ownerId ? `${userId}:${ownerId}` : null

  if (scope === _cachedPermissionsScope && _cachedPermissions !== null) {
    return _cachedPermissions
  }

  _cachedPermissions = await getUserPermissions()
  _cachedPermissionsScope = scope
  return _cachedPermissions
}

/**
 * @deprecated Ambiguous compatibility helper. Prefer explicit workspace checks.
 * This wrapper uses current workspace membership only.
 */
export async function hasPermission(key: string): Promise<boolean> {
  const perms = await getCachedPermissions()
  return perms.includes(key)
}

/**
 * @deprecated Ambiguous compatibility helper. Prefer explicit workspace checks.
 * This wrapper uses current workspace membership only.
 */
export async function hasAnyPermission(keys: string[]): Promise<boolean> {
  const perms = await getCachedPermissions()
  return keys.some((k) => perms.includes(k))
}

/**
 * @deprecated Ambiguous compatibility helper. Prefer explicit workspace checks.
 * This wrapper uses current workspace membership only.
 */
export async function hasAllPermissions(keys: string[]): Promise<boolean> {
  const perms = await getCachedPermissions()
  return keys.every((k) => perms.includes(k))
}

// ═══════════════════════════════════════════════════════════════
// 3. Семантические проверки (доменные)
// ═══════════════════════════════════════════════════════════════

/**
 * @deprecated Ambiguous compatibility helper. Prefer explicit workspace checks.
 * This wrapper uses current workspace membership only.
 */
export async function canManageProjects(): Promise<boolean> {
  return hasAnyPermission([
    "projects.create",
    "projects.update",
    "projects.delete",
  ])
}

/**
 * @deprecated Ambiguous compatibility helper. Prefer explicit workspace checks.
 * This wrapper uses current workspace membership only.
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
 * @deprecated Ambiguous compatibility helper. Prefer explicit workspace checks.
 * This wrapper uses current workspace membership only.
 */
export async function canViewBilling(): Promise<boolean> {
  return hasPermission("billing.read")
}

/**
 * @deprecated Ambiguous compatibility helper. Prefer explicit workspace checks.
 * This wrapper uses current workspace membership only.
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
 * @deprecated Ambiguous compatibility guard. Prefer explicit workspace checks.
 * This wrapper uses current workspace membership only.
 */
export async function requirePermission(key: string): Promise<void> {
  await requireAuth()
  const has = await hasPermission(key)
  if (!has) {
    throw new Error(`Forbidden: отсутствует разрешение "${key}"`)
  }
}

/**
 * @deprecated Ambiguous compatibility guard. Prefer explicit workspace checks.
 * This wrapper uses current workspace membership only.
 */
export async function requireRole(role: string): Promise<void> {
  await requireAuth()
  const has = await hasRole(role)
  if (!has) {
    throw new Error(`Forbidden: недостаточно прав (требуется роль "${role}")`)
  }
}
