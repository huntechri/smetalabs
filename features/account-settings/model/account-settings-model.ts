import type { WorkspaceMember } from "@/features/workspace-settings/model/workspace-settings-model"

/**
 * Computes initials from a display name for the avatar fallback.
 */
export function getProfileInitials(displayName: string | null | undefined): string {
  if (!displayName?.trim()) return "?"
  return displayName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

/**
 * Formats the raw Supabase last-login ISO string on Russian locale (ru-RU).
 */
export function formatLastLogin(lastLogin: string | null | undefined): string {
  if (!lastLogin) return "—"
  try {
    return new Date(lastLogin).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

/**
 * Filters active workspace members who are not the owner to populate transfer ownership candidates.
 */
export function getOwnerTransferCandidates(members: WorkspaceMember[]): WorkspaceMember[] {
  if (!Array.isArray(members)) return []
  return members.filter(
    (member) => member.status === "active" && member.role !== "owner"
  )
}

/**
 * Extracts error message from unknown error objects.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}
