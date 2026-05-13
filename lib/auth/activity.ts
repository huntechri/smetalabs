import { supabase } from "@/db"

const ACTIVITY_TOUCH_INTERVAL_MS = 5 * 60 * 1000

/**
 * Updates workspace activity for the authenticated user.
 *
 * This is intentionally throttled to avoid writing to workspace_members on every
 * navigation/request. The user can belong to multiple workspaces, so every active
 * membership row for the user is touched when the previous activity timestamp is
 * missing or stale.
 */
export async function touchWorkspaceActivity(userId: string) {
  if (!userId) return

  const now = new Date()
  const cutoff = new Date(now.getTime() - ACTIVITY_TOUCH_INTERVAL_MS)

  const { error } = await supabase
    .from("workspace_members")
    .update({
      last_active_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`last_active_at.is.null,last_active_at.lt.${cutoff.toISOString()}`)

  if (error) {
    console.warn("[touchWorkspaceActivity] Failed to update activity", {
      userId,
      message: error.message,
    })
  }
}
