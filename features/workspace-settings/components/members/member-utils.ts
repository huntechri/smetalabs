import type { Role } from "@/types/roles"
import type { WorkspaceMember } from "../../types"

export const EDITABLE_ROLES: Role[] = ["admin", "manager", "estimator", "viewer"]

export type MemberActions = {
  onChangeRole: (member: WorkspaceMember, role: Role) => Promise<void>
  onOpenRoleChange: (member: WorkspaceMember) => void
  onResetPassword: (member: WorkspaceMember) => void
  onToggleSuspend: (member: WorkspaceMember) => void
  onRemoveMember: (member: WorkspaceMember) => void
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
}

export function formatDate(dateStr: string) {
  if (dateStr === "—") return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatRelative(dateStr: string) {
  if (dateStr === "—") return "—"
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "только что"
  if (diffMins < 60) return `${diffMins} мин. назад`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} ч. назад`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} дн. назад`
  return formatDate(dateStr)
}

export function formatMemberActivity(member: WorkspaceMember) {
  if (member.lastActiveAt && member.lastActiveAt !== "—") {
    return formatRelative(member.lastActiveAt)
  }

  if (member.status === "invited") return "Не входил"
  if (member.status === "suspended") return "Заблокирован"

  return "Нет данных"
}
