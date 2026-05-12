import { supabase as adminSupabase } from "@/db"

type AcceptInvitationResult =
  | { success: true; invitationId: string }
  | {
      success: false
      reason:
        | "no_user"
        | "no_invitation_metadata"
        | "not_found"
        | "expired"
        | "email_mismatch"
    }

/**
 * Accept a pending workspace invitation stored in Supabase Auth user metadata.
 *
 * Supabase invite links can land with tokens in the URL hash, so this must run
 * after the browser has established a session and the server can authenticate
 * the user from cookies.
 */
export async function acceptInvitationIfPresent(
  userId: string
): Promise<AcceptInvitationResult> {
  const { data: authUser, error: userError } =
    await adminSupabase.auth.admin.getUserById(userId)
  if (userError || !authUser?.user) return { success: false, reason: "no_user" }

  const metadata = authUser.user.user_metadata ?? {}
  const invitationId = metadata.invitation_id
  if (!invitationId || typeof invitationId !== "string") {
    return { success: false, reason: "no_invitation_metadata" }
  }

  const { data: invitation, error: invitationError } = await adminSupabase
    .from("workspace_invitations")
    .select("id,email,role_id,owner_id,invited_by,status,expires_at")
    .eq("id", invitationId)
    .eq("status", "pending")
    .maybeSingle()

  if (invitationError) throw invitationError
  if (!invitation) return { success: false, reason: "not_found" }
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return { success: false, reason: "expired" }
  }
  if (authUser.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return { success: false, reason: "email_mismatch" }
  }

  const now = new Date().toISOString()

  const { error: memberError } = await adminSupabase
    .from("workspace_members")
    .upsert(
      {
        user_id: userId,
        owner_id: invitation.owner_id,
        role_id: invitation.role_id,
        status: "active",
        joined_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,owner_id" }
    )

  if (memberError) throw memberError

  const { error: deleteError } = await adminSupabase
    .from("workspace_invitations")
    .delete()
    .eq("id", invitation.id)
    .eq("owner_id", invitation.owner_id)
    .eq("status", "pending")

  if (deleteError) throw deleteError

  return { success: true, invitationId: invitation.id }
}
