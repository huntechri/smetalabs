export type WorkspaceRole = "owner" | "admin" | "manager" | "estimator" | "viewer"

export type WorkspaceMemberStatus = "active" | "invited" | "suspended"

export type WorkspaceMember = {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: WorkspaceRole
  status: WorkspaceMemberStatus
  joinedAt: string
  lastActiveAt: string
}

export type WorkspaceInvitationStatus = "pending" | "expired"

export type WorkspaceInvitation = {
  id: string
  email: string
  role: WorkspaceRole
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

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  estimator: "Сметчик",
  viewer: "Наблюдатель",
}

export const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  owner:
    "Полный доступ ко всем ресурсам workspace. Может управлять командой, биллингом и удалять workspace.",
  admin:
    "Управление участниками, настройками и проектами. Не может удалить workspace или передать права владельца.",
  manager:
    "Создание и редактирование смет, управление проектами и закупками. Ограниченный доступ к настройкам команды.",
  estimator:
    "Создание и редактирование смет. Доступ только к назначенным проектам.",
  viewer:
    "Просмотр смет и проектов без возможности редактирования. Доступ только для чтения.",
}

export const STATUS_LABELS: Record<WorkspaceMemberStatus, string> = {
  active: "Активен",
  invited: "Приглашён",
  suspended: "Заблокирован",
}
