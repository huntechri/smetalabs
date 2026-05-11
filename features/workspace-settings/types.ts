import type { Role } from "@/types/roles"

export type WorkspaceMemberStatus = "active" | "invited" | "suspended"

export type WorkspaceMember = {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: Role
  status: WorkspaceMemberStatus
  joinedAt: string
  lastActiveAt: string
}

export type WorkspaceInvitationStatus = "pending" | "expired"

export type WorkspaceInvitation = {
  id: string
  email: string
  role: Role
  invitedBy: string
  invitedAt: string
  expiresAt: string
  status: WorkspaceInvitationStatus
}

export type WorkspaceOverview = {
  name: string
  slug: string
  companyName: string
  ownerName: string
  planName: string
  memberLimit: number
  currentMembers: number
}

export type AllowedDomain = {
  id: string
  domain: string
  addedBy: string
  addedAt: string
}

export const STATUS_LABELS: Record<WorkspaceMemberStatus, string> = {
  active: "Активен",
  invited: "Приглашён",
  suspended: "Заблокирован",
}
