import { NextRequest, NextResponse } from "next/server"
import {
  canManageTeamForWorkspace,
  canReadTeamForWorkspace,
  requireCurrentWorkspace,
} from "@/lib/auth/team"
import { requireAuth } from "@/lib/auth/permissions"

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

async function requireWorkspaceAccess(manage = false) {
  const user = await requireAuth()
  const ownerId = await requireCurrentWorkspace(user.id)
  const allowed = manage
    ? await canManageTeamForWorkspace(user.id, ownerId)
    : await canReadTeamForWorkspace(user.id, ownerId)
  if (!allowed) throw new Error("FORBIDDEN")
}

/**
 * Invite links do not have authoritative workspace-scoped storage yet.
 * Return explicit 501 instead of pretending user_settings is production state.
 */
export async function GET() {
  try {
    await requireWorkspaceAccess(false)
    return jsonError(
      "NOT_IMPLEMENTED",
      "Пригласительная ссылка ещё не реализована",
      501
    )
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized"))
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    if (err instanceof Error && err.message === "FORBIDDEN")
      return jsonError("FORBIDDEN", "Недостаточно прав", 403)
    return jsonError("INTERNAL_ERROR", "Ошибка обработки запроса", 500)
  }
}

export async function PATCH(_request: NextRequest) {
  try {
    await requireWorkspaceAccess(true)
    return jsonError(
      "NOT_IMPLEMENTED",
      "Пригласительная ссылка ещё не реализована",
      501
    )
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized"))
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    if (err instanceof Error && err.message === "FORBIDDEN")
      return jsonError("FORBIDDEN", "Недостаточно прав", 403)
    return jsonError("INTERNAL_ERROR", "Ошибка обработки запроса", 500)
  }
}
