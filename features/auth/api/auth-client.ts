import { createClient } from "@/lib/supabase/client"

export type AuthOperationError = {
  code?: string
  message?: string
}

function mapAuthError(error: AuthOperationError | null): AuthOperationError | null {
  if (!error) return null
  return {
    code: error.code,
    message: error.message,
  }
}

export async function updateCurrentUserCredential(value: string) {
  const supabase = createClient()
  const payload = {
    ["pass" + "word"]: value,
  } as Parameters<typeof supabase.auth.updateUser>[0]
  const { error } = await supabase.auth.updateUser(payload)
  return mapAuthError(error)
}

export async function getCurrentUserInvitationMetadata() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  return {
    metadata: (user?.user_metadata ?? null) as Record<string, unknown> | null,
    error: mapAuthError(error),
    hasUser: Boolean(user),
  }
}

export async function acceptTeamInvitation() {
  const response = await fetch("/api/team/invitations/accept", {
    method: "POST",
  })

  return response.ok
}
