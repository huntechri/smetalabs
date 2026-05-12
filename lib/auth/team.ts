import { supabase } from '@/db'

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'estimator' | 'viewer'

const MANAGE_TEAM_ROLES = new Set<WorkspaceRole>(['owner', 'admin'])
const READ_TEAM_ROLES = new Set<WorkspaceRole>(['owner', 'admin', 'manager'])

export async function getPrimaryWorkspace(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('owner_id, roles!inner(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Не удалось определить workspace: ${error.message}`)
  }

  return data?.owner_id ?? userId
}

export async function getWorkspaceRole(
  userId: string,
  ownerId?: string
): Promise<WorkspaceRole | null> {
  const workspaceOwnerId = ownerId ?? (await getPrimaryWorkspace(userId))

  if (userId === workspaceOwnerId) return 'owner'

  const { data, error } = await supabase
    .from('workspace_members')
    .select('roles!inner(name)')
    .eq('user_id', userId)
    .eq('owner_id', workspaceOwnerId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    throw new Error(`Не удалось проверить роль: ${error.message}`)
  }

  const roles = (data as { roles?: { name?: string } | { name?: string }[] | null } | null)?.roles
  const roleName = Array.isArray(roles) ? roles[0]?.name : roles?.name

  return (roleName as WorkspaceRole | undefined) ?? null
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

export async function getRoleId(role: Exclude<WorkspaceRole, 'owner'> | WorkspaceRole) {
  const { data, error } = await supabase
    .from('roles')
    .select('id')
    .eq('name', role)
    .maybeSingle()

  if (error || !data?.id) {
    throw new Error(`Роль "${role}" не найдена`)
  }

  return data.id as string
}
