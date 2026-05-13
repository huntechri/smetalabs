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

type PendingInvitation = {
  id: string
  email: string
  role_id: string
  owner_id: string
  invited_by: string
  status: string
  expires_at: string
}

async function findPendingInvitation(invitationId: unknown, email: string) {
  if (typeof invitationId === "string" && invitationId.length > 0) {
    const { data, error } = await adminSupabase
      .from("workspace_invitations")
      .select("id,email,role_id,owner_id,invited_by,status,expires_at")
      .eq("id", invitationId)
      .eq("status", "pending")
      .maybeSingle()

    if (error) throw error
    if (data) return data as PendingInvitation
  }

  const { data, error } = await adminSupabase
    .from("workspace_invitations")
    .select("id,email,role_id,owner_id,invited_by,status,expires_at")
    .eq("email", email)
    .eq("status", "pending")
    .order("invited_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as PendingInvitation | null
}

export async function acceptInvitationIfPresent(
  userId: string
): Promise<AcceptInvitationResult> {
  const { data: authUser, error: userError } =
    await adminSupabase.auth.admin.getUserById(userId)
  if (userError || !authUser?.user) return { success: false, reason: "no_user" }

  const email = authUser.user.email?.toLowerCase()
  if (!email) return { success: false, reason: "email_mismatch" }

  const metadata = authUser.user.user_metadata ?? {}
  const invitationId = metadata.invitation_id
  const invitation = await findPendingInvitation(invitationId, email)

  if (!invitation) {
    return typeof invitationId === "string" && invitationId.length > 0
      ? { success: false, reason: "not_found" }
      : { success: false, reason: "no_invitation_metadata" }
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return { success: false, reason: "expired" }
  }
  if (email !== invitation.email.toLowerCase()) {
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
