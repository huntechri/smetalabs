import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getUserNotifications,
  getUnreadCount,
} from "@/features/notifications/server/notifications.repository"

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/**
 * GET /api/notifications
 * Возвращает список активных уведомлений пользователя и общее количество непрочитанных.
 */
export async function GET(request: NextRequest) {
  try {
    const client = await createClient()
    const { data } = await client.auth.getUser()
    const user = data.user
    if (!user) return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)

    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0)

    const [notifications, unreadCount] = await Promise.all([
      getUserNotifications(user.id, { unreadOnly, limit, offset }),
      getUnreadCount(user.id),
    ])

    // Определяем, есть ли еще элементы для загрузки
    const hasMore = notifications.length === limit

    return NextResponse.json({
      data: {
        notifications,
        unreadCount,
        hasMore,
      },
    })
  } catch (err) {
    console.error("[GET /api/notifications]", err)
    return jsonError(
      "INTERNAL_ERROR",
      "Ошибка при получении списка уведомлений",
      500
    )
  }
}
