import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/permissions"
import { acceptInvitationIfPresent } from "@/lib/auth/invitations"

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

function invitationAcceptError(reason: string) {
  switch (reason) {
    case "no_user":
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    case "no_invitation_metadata":
      return jsonError(
        "INVITATION_REQUIRED",
        "Приглашение не найдено в текущей сессии",
        400
      )
    case "not_found":
      return jsonError(
        "INVITATION_NOT_FOUND",
        "Приглашение не найдено или уже использовано",
        404
      )
    case "expired":
      return jsonError(
        "INVITATION_EXPIRED",
        "Срок действия приглашения истёк",
        410
      )
    case "email_mismatch":
      return jsonError(
        "INVITATION_EMAIL_MISMATCH",
        "Приглашение предназначено для другого email",
        403
      )
    default:
      return jsonError(
        "INVITATION_ACCEPT_FAILED",
        "Не удалось принять приглашение",
        400
      )
  }
}

/**
 * POST /api/team/invitations/accept
 * Accepts the pending invitation referenced by the authenticated user's metadata.
 */
export async function POST() {
  try {
    const user = await requireAuth()
    const result = await acceptInvitationIfPresent(user.id)

    if (!result.success) {
      return invitationAcceptError(result.reason)
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    }

    console.error("[POST /api/team/invitations/accept]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка принятия приглашения", 500)
  }
}
