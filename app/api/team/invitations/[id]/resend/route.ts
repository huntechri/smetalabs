import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/db"
import { canManageTeamForWorkspace } from "@/lib/auth/team"
import { requireAuth } from "@/lib/auth/permissions"

type RouteContext = { params: Promise<{ id: string }> }

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const { data: invitation, error: invitationError } = await supabase
      .from("workspace_invitations")
      .select("id,email,owner_id,status")
      .eq("id", id)
      .maybeSingle()

    if (invitationError) throw invitationError
    if (!invitation) {
      return jsonError("NOT_FOUND", "Приглашение не найдено", 404)
    }

    if (!(await canManageTeamForWorkspace(user.id, invitation.owner_id))) {
      return jsonError(
        "FORBIDDEN",
        "Недостаточно прав для повторной отправки приглашения",
        403
      )
    }

    if (invitation.status === "expired") {
      return jsonError(
        "BAD_REQUEST",
        "Истёкшее приглашение нельзя отправить повторно",
        400
      )
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000"
    const { error } = await supabase.auth.admin.inviteUserByEmail(
      invitation.email,
      {
        redirectTo: `${siteUrl}/set-password`,
        data: { invitation_id: id },
      }
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    }

    console.error("[POST /api/team/invitations/[id]/resend]", err)
    return jsonError(
      "INTERNAL_ERROR",
      "Ошибка повторной отправки приглашения",
      500
    )
  }
}
