import type { WorkspaceMember } from "../types"

export type ApiMember = {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
  roles: Array<{ id: string; name: string; label: string }>
  status: string
  joinedAt: string
  lastActiveAt?: string | null
  primaryRole: string | null
  primaryRoleLabel: string | null
  phone?: string | null
  position?: string | null
}

export function mapApiMember(api: ApiMember): WorkspaceMember {
  return {
    id: api.id,
    name: api.name,
    email: api.email ?? "",
    avatarUrl: api.avatarUrl ?? undefined,
    role: (api.primaryRole as WorkspaceMember["role"]) ?? "viewer",
    status: (api.status as WorkspaceMember["status"]) ?? "active",
    joinedAt: api.joinedAt,
    lastActiveAt: api.lastActiveAt ?? "—",
  }
}
