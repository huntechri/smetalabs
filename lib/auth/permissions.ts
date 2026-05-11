import { createClient as createSupabaseClient } from "@/lib/supabase/server"

/**
 * Get the current user's roles from the user_roles table.
 * Returns an array of role names (e.g. ["owner", "admin"]).
 */
export async function getUserRoles(): Promise<string[]> {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", user.id)

  return data?.map((r: any) => r.role?.name).filter(Boolean) ?? []
}

/**
 * Check if the current user has a specific role.
 */
export async function hasRole(role: string): Promise<boolean> {
  const roles = await getUserRoles()
  return roles.includes(role)
}

/**
 * Check if the current user has one of the given roles.
 */
export async function hasAnyRole(roles: string[]): Promise<boolean> {
  const userRoles = await getUserRoles()
  return roles.some((r) => userRoles.includes(r))
}

/**
 * Check if the current user has write access (owner, admin, or manager).
 */
export async function canWrite(): Promise<boolean> {
  return hasAnyRole(["owner", "admin", "manager"])
}

/**
 * Check if the current user can manage team (owner or admin).
 */
export async function canManageTeam(): Promise<boolean> {
  return hasAnyRole(["owner", "admin"])
}

/**
 * Require authentication. Throws if not authenticated.
 */
export async function requireAuth() {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

/**
 * Require a specific role. Throws if not authorized.
 */
export async function requireRole(role: string) {
  await requireAuth()
  const has = await hasRole(role)
  if (!has) throw new Error("Forbidden: insufficient permissions")
}
