import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { archiveNotifications } from "@/features/notifications/server/notifications.repository"

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/**
 * POST /api/notifications/archive
 * Отправляет уведомления в архив (мягкое удаление).
 * Тело запроса: { ids: string[] } или { all: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const client = await createClient()
    const { data } = await client.auth.getUser()
    const user = data.user
    if (!user) return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)

    const body = await request.json()
    const { ids, all = false } = body

    await archiveNotifications(user.id, ids, all)

    return NextResponse.json({
      data: {
        success: true,
      },
    })
  } catch (err) {
    console.error("[POST /api/notifications/archive]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при переносе уведомлений в архив", 500)
  }
}
