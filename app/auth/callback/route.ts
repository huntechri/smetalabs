import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabase as adminSupabase } from '@/db'

async function acceptInvitationIfPresent(userId: string) {
  const { data: authUser, error: userError } = await adminSupabase.auth.admin.getUserById(userId)
  if (userError || !authUser?.user) return

  const metadata = authUser.user.user_metadata ?? {}
  const invitationId = metadata.invitation_id
  if (!invitationId || typeof invitationId !== 'string') return

  const { data: invitation, error: invitationError } = await adminSupabase
    .from('workspace_invitations')
    .select('id,email,role_id,owner_id,invited_by,status,expires_at')
    .eq('id', invitationId)
    .eq('status', 'pending')
    .maybeSingle()

  if (invitationError || !invitation) return
  if (new Date(invitation.expires_at).getTime() < Date.now()) return
  if (authUser.user.email?.toLowerCase() !== invitation.email.toLowerCase()) return

  const { error: memberError } = await adminSupabase
    .from('workspace_members')
    .upsert(
      {
        user_id: userId,
        owner_id: invitation.owner_id,
        role_id: invitation.role_id,
        status: 'active',
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,owner_id' }
    )

  if (memberError) throw memberError

  const { error: roleError } = await adminSupabase
    .from('user_roles')
    .upsert(
      {
        user_id: userId,
        role_id: invitation.role_id,
        assigned_by: invitation.invited_by,
      },
      { onConflict: 'user_id,role_id' }
    )

  if (roleError) throw roleError

  await adminSupabase.from('workspace_invitations').delete().eq('id', invitation.id)
}

/**
 * OAuth / Email callback handler.
 * Handles token_hash and code-based Supabase Auth callbacks.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('code')

  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      const { data } = await supabase.auth.getUser()
      if (data.user) await acceptInvitationIfPresent(data.user.id)
      redirectTo.searchParams.delete('next')
      return NextResponse.redirect(redirectTo)
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data } = await supabase.auth.getUser()
      if (data.user) await acceptInvitationIfPresent(data.user.id)
      redirectTo.searchParams.delete('next')
      return NextResponse.redirect(redirectTo)
    }
  }

  redirectTo.pathname = '/login'
  redirectTo.searchParams.set('error', 'auth_callback_failed')
  return NextResponse.redirect(redirectTo)
}
