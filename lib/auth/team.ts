/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/db"

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "manager"
  | "estimator"
  | "viewer"
export type WorkspaceMemberStatus = "active" | "invited" | "suspended"

export type WorkspaceMember = {
  id?: string
  userId: string
  ownerId: string
  roleId: string | null
  role: WorkspaceRole
  status: WorkspaceMemberStatus
}

const MANAGE_TEAM_ROLES = new Set<WorkspaceRole>(["owner", "admin"])
const READ_TEAM_ROLES = new Set<WorkspaceRole>(["owner", "admin", "manager"])
const ADMIN_LOCK_ROLES = new Set<WorkspaceRole>(["owner", "admin"])

function pickRoleName(roles: unknown): WorkspaceRole | null {
  const role = Array.isArray(roles) ? roles[0] : roles
  const name = (role as { name?: string } | null)?.name
  if (
    name === "owner" ||
    name === "admin" ||
    name === "manager" ||
    name === "estimator" ||
    name === "viewer"
  ) {
    return name
  }
  return null
}

function toMember(row: any): WorkspaceMember {
  const role =
    pickRoleName(row.roles) ??
    (row.user_id === row.owner_id ? "owner" : "viewer")
  return {
    id: row.id,
    userId: row.user_id,
    ownerId: row.owner_id,
    roleId: row.role_id ?? null,
    role,
    status: row.status ?? "active",
  }
}

/**
 * Resolve the current workspace deterministically.
 *
 * Current data model uses workspace_members.owner_id as the workspace boundary.
 * Prefer the user's own workspace when present, otherwise the oldest active
 * membership. If no membership exists yet, fall back to userId so early owner
 * accounts created before workspace_members keep working.
 */
export async function getPrimaryWorkspace(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("owner_id,user_id,status,created_at,roles!inner(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Не удалось определить workspace: ${error.message}`)
  }

  const memberships = data ?? []
  const ownWorkspace = memberships.find((m: any) => m.owner_id === userId)
  return ownWorkspace?.owner_id ?? memberships[0]?.owner_id ?? userId
}

export async function requireCurrentWorkspace(userId: string): Promise<string> {
  const ownerId = await getPrimaryWorkspace(userId)
  if (ownerId !== userId) {
    await requireWorkspaceMember(userId, ownerId)
  }
  return ownerId
}

export async function requireWorkspaceMember(
  userId: string,
  ownerId: string
): Promise<WorkspaceMember> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("id,user_id,owner_id,role_id,status,roles!inner(name)")
    .eq("user_id", userId)
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .maybeSingle()

  if (error) {
    throw new Error(
      `Не удалось проверить участника workspace: ${error.message}`
    )
  }

  if (data) return toMember(data)

  if (userId === ownerId) {
    const ownerRoleId = await getRoleId("owner")
    return {
      userId,
      ownerId,
      roleId: ownerRoleId,
      role: "owner",
      status: "active",
    }
  }

  throw new Error("WORKSPACE_MEMBER_REQUIRED")
}

export async function getWorkspaceRole(
  userId: string,
  ownerId?: string
): Promise<WorkspaceRole | null> {
  const workspaceOwnerId = ownerId ?? (await getPrimaryWorkspace(userId))

  try {
    const member = await requireWorkspaceMember(userId, workspaceOwnerId)
    return member.role
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED")
      return null
    throw err
  }
}

export async function canReadTeamForWorkspace(
  userId: string,
  ownerId?: string
): Promise<boolean> {
  const role = await getWorkspaceRole(userId, ownerId)
  return role !== null && READ_TEAM_ROLES.has(role)
}

export async function canManageTeamForWorkspace(
  userId: string,
  ownerId?: string
): Promise<boolean> {
  const role = await getWorkspaceRole(userId, ownerId)
  return role !== null && MANAGE_TEAM_ROLES.has(role)
}

export async function getRoleId(role: WorkspaceRole) {
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", role)
    .maybeSingle()

  if (error || !data?.id) {
    throw new Error(`Роль "${role}" не найдена`)
  }

  return data.id as string
}

export async function getWorkspaceMemberByUser(
  userId: string,
  ownerId: string,
  includeInactive = false
): Promise<WorkspaceMember | null> {
  let query = supabase
    .from("workspace_members")
    .select("id,user_id,owner_id,role_id,status,roles!inner(name)")
    .eq("user_id", userId)
    .eq("owner_id", ownerId)

  if (!includeInactive) query = query.eq("status", "active")

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (data) return toMember(data)
  if (userId === ownerId) return requireWorkspaceMember(userId, ownerId)
  return null
}

export async function assertWorkspaceAdminContinuity(
  ownerId: string,
  targetUserId?: string
): Promise<void> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id,status,roles!inner(name)")
    .eq("owner_id", ownerId)
    .eq("status", "active")

  if (error) throw error

  const remainingAdmins = (data ?? []).filter((row: any) => {
    if (row.user_id === targetUserId) return false
    const role = pickRoleName(row.roles)
    return role ? ADMIN_LOCK_ROLES.has(role) : false
  })

  if (
    ownerId !== targetUserId &&
    !remainingAdmins.some((row: any) => row.user_id === ownerId)
  ) {
    remainingAdmins.push({
      user_id: ownerId,
      status: "active",
      roles: [{ name: "owner" }],
    })
  }

  if (remainingAdmins.length === 0) {
    throw new Error("LAST_WORKSPACE_ADMIN")
  }
}
