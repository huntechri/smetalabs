import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/db"
import {
  canManageTeamForWorkspace,
  requireCurrentWorkspace,
} from "@/lib/auth/team"
import { requireAuth } from "@/lib/auth/permissions"

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/** DELETE /api/team/invitations/[id] — revoke pending invitation in current workspace only. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const ownerId = await requireCurrentWorkspace(user.id)
    if (!(await canManageTeamForWorkspace(user.id, ownerId))) {
      return jsonError(
        "FORBIDDEN",
        "Недостаточно прав для отзыва приглашений",
        403
      )
    }

    const { id } = await params
    const { data, error } = await supabase
      .from("workspace_invitations")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle()

    if (error) throw error
    if (!data) return jsonError("NOT_FOUND", "Приглашение не найдено", 404)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized"))
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    console.error("[DELETE /api/team/invitations/[id]]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при отзыве приглашения", 500)
  }
}
