import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"

/**
 * GET /api/settings
 *
 * Возвращает настройки текущего пользователя.
 * Формат ответа:
 * {
 *   "data": { profile, workspace, preferences, notifications, security },
 *   "meta": { updatedAt }
 * }
 */
export async function GET() {
  // ── Step 1: Auth check (через SSR-клиент с cookies) ──
  let ssrClient
  try {
    ssrClient = await createClient()
  } catch (err) {
    console.error("[GET /api/settings] createClient failed:", err)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ошибка при создании клиента",
        },
      },
      { status: 500 }
    )
  }

  let user
  try {
    const result = await ssrClient.auth.getUser()
    user = result.data?.user ?? null
    if (result.error) {
      console.error("[GET /api/settings] getUser returned error:", result.error)
    }
  } catch (err) {
    console.error("[GET /api/settings] getUser threw:", err)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ошибка при проверке аутентификации",
        },
      },
      { status: 500 }
    )
  }

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Требуется аутентификация",
        },
      },
      { status: 401 }
    )
  }

  // ── Step 2: Fetch user_settings (service_role bypasses RLS) ──
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("profile, workspace, preferences, notifications, security, updated_at")
      .eq("user_id", user.id)
      .single()

    if (error) {
      // Если записи ещё нет — возвращаем пустые объекты (дефолты)
      if (error.code === "PGRST116") {
        return NextResponse.json({
          data: {
            profile: {},
            workspace: {},
            preferences: {},
            notifications: {},
            security: {},
          },
          meta: { updatedAt: null },
        })
      }

      console.error("[GET /api/settings] query failed:", error)
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Ошибка при загрузке настроек",
            details: error.message,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        profile: data.profile ?? {},
        workspace: data.workspace ?? {},
        preferences: data.preferences ?? {},
        notifications: data.notifications ?? {},
        security: data.security ?? {},
      },
      meta: { updatedAt: data.updated_at },
    })
  } catch (err: any) {
    console.error("[GET /api/settings] unexpected error:", err)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ошибка при загрузке настроек",
          details: err?.message,
        },
      },
      { status: 500 }
    )
  }
}
