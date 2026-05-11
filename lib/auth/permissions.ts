import { db } from "@/db"
import {
  userRoles,
  roles,
  permissions,
  rolePermissions,
} from "@/db/schema/rbac"
import { createClient } from "@/lib/supabase/server"
import { eq, inArray } from "drizzle-orm"
import type { PermissionKey } from "@/features/access-control/types"

// ── Auth helpers ──

/**
 * Get the current authenticated user from Supabase Auth.
 * Returns the user or null if not authenticated.
 */
async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// ── Role helpers ──

/**
 * Get the current user's roles from the user_roles table.
 * Uses Drizzle JOIN across user_roles → roles.
 */
export async function getUserRoles(): Promise<string[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, user.id))

  return rows.map((r) => r.name).filter(Boolean)
}

/**
 * Get the current user's permission keys.
 * Uses Drizzle JOIN: user_roles → role_permissions → permissions.
 */
export async function getUserPermissions(): Promise<PermissionKey[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const rows = await db
    .select({ key: permissions.key })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(userRoles.userId, user.id))

  return rows.map((r) => r.key as PermissionKey)
}

// ── Permission checks ──

let _cachedPermissions: PermissionKey[] | null = null

async function ensurePermissions(): Promise<PermissionKey[]> {
  if (!_cachedPermissions) {
    _cachedPermissions = await getUserPermissions()
  }
  return _cachedPermissions
}

/**
 * Check if the current user has a specific permission.
 */
export async function hasPermission(key: PermissionKey): Promise<boolean> {
  const perms = await ensurePermissions()
  return perms.includes(key)
}

/**
 * Check if the current user has any of the given permissions.
 */
export async function hasAnyPermission(keys: PermissionKey[]): Promise<boolean> {
  const perms = await ensurePermissions()
  return keys.some((k) => perms.includes(k))
}

/**
 * Check if the current user has all of the given permissions.
 */
export async function hasAllPermissions(keys: PermissionKey[]): Promise<boolean> {
  const perms = await ensurePermissions()
  return keys.every((k) => perms.includes(k))
}

/**
 * Check if the current user can manage projects (create projects).
 */
export async function canManageProjects(): Promise<boolean> {
  return hasPermission("projects.create")
}

/**
 * Check if the current user can manage estimates (create estimates).
 */
export async function canManageEstimates(): Promise<boolean> {
  return hasPermission("estimates.create")
}

/**
 * Check if the current user can manage purchases (create purchases).
 */
export async function canManagePurchases(): Promise<boolean> {
  return hasPermission("purchases.create")
}

/**
 * Check if the current user can manage the team.
 */
export async function canManageTeam(): Promise<boolean> {
  return hasPermission("team.manage")
}

/**
 * Check if the current user can view billing.
 */
export async function canViewBilling(): Promise<boolean> {
  return hasPermission("billing.read")
}

/**
 * Require authentication. Throws if not authenticated.
 * Returns the authenticated user.
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

/**
 * Require a specific permission key. Throws if not authorized.
 */
export async function requirePermission(key: PermissionKey) {
  await requireAuth()
  const has = await hasPermission(key)
  if (!has) throw new Error("Forbidden: insufficient permissions")
}

/**
 * Clear the cached permissions (useful after role changes).
 */
export function clearPermissionCache() {
  _cachedPermissions = null
}
