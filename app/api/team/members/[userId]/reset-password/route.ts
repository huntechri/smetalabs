import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/db"
import { canManageTeam, requireAuth } from "@/lib/auth/permissions"

type RouteContext = { params: Promise<{ userId: string }> }

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

async function assertCanManageMembers() {
  await requireAuth()
  if (!(await canManageTeam())) {
    throw new Error("FORBIDDEN")
  }
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    await assertCanManageMembers()
    const { userId } = await params

    const { data, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError) throw userError

    const email = data.user?.email
    if (!email) {
      return jsonError("NOT_FOUND", "Email участника не найден", 404)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ""
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/settings/account`,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return jsonError("FORBIDDEN", "Недостаточно прав для сброса пароля", 403)
    }

    console.error("[POST /api/team/members/[userId]/reset-password]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при отправке ссылки для сброса пароля", 500)
  }
}
