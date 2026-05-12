import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"

/**
 * GET /api/team/invite-link
 * Возвращает текущее состояние пригласительной ссылки.
 *
 * PATCH /api/team/invite-link
 * Обновляет состояние пригласительной ссылки (вкл/выкл, роль по умолчанию).
 */
export async function GET() {
  // ── Auth check ──
  let ssrClient
  try {
    ssrClient = await createClient()
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при создании клиента" } },
      { status: 500 }
    )
  }

  let user
  try {
    const result = await ssrClient.auth.getUser()
    user = result.data?.user ?? null
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при проверке аутентификации" } },
      { status: 500 }
    )
  }

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Требуется аутентификация" } },
      { status: 401 }
    )
  }

  // ── Fetch invite link state from user_settings ──
  try {
    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("workspace")
      .eq("user_id", user.id)
      .maybeSingle()

    const ws = (settingsData?.workspace ?? {}) as Record<string, any>

    const enabled = ws.inviteLinkEnabled ?? true
    const defaultRole = ws.inviteLinkDefaultRole ?? "viewer"
    const slug = ws.inviteLinkSlug ?? "join"

    return NextResponse.json({
      data: {
        enabled,
        url: enabled ? `https://app.smetalabs.ru/join/${slug}` : null,
        defaultRole,
      },
    })
  } catch (err: any) {
    console.error("[GET /api/team/invite-link] error:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при загрузке ссылки" } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  // ── Auth check ──
  let ssrClient
  try {
    ssrClient = await createClient()
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при создании клиента" } },
      { status: 500 }
    )
  }

  let user
  try {
    const result = await ssrClient.auth.getUser()
    user = result.data?.user ?? null
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при проверке аутентификации" } },
      { status: 500 }
    )
  }

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Требуется аутентификация" } },
      { status: 401 }
    )
  }

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Некорректный JSON" } },
      { status: 400 }
    )
  }

  // ── Fetch current workspace settings ──
  const { data: settingsData } = await supabase
    .from("user_settings")
    .select("workspace")
    .eq("user_id", user.id)
    .maybeSingle()

  const ws = (settingsData?.workspace ?? {}) as Record<string, any>

  // ── Apply updates ──
  if (typeof body.enabled === "boolean") {
    ws.inviteLinkEnabled = body.enabled
  }
  if (typeof body.defaultRole === "string") {
    const validRoles = ["admin", "manager", "estimator", "viewer"]
    if (!validRoles.includes(body.defaultRole)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Недопустимая роль" } },
        { status: 400 }
      )
    }
    ws.inviteLinkDefaultRole = body.defaultRole
  }

  // ── Save ──
  try {
    await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        workspace: ws,
        updated_at: new Date().toISOString(),
      })

    const slug = ws.inviteLinkSlug ?? "join"

    return NextResponse.json({
      data: {
        enabled: ws.inviteLinkEnabled ?? true,
        url: (ws.inviteLinkEnabled ?? true)
          ? `https://app.smetalabs.ru/join/${slug}`
          : null,
        defaultRole: ws.inviteLinkDefaultRole ?? "viewer",
      },
    })
  } catch (err: any) {
    console.error("[PATCH /api/team/invite-link] save error:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при сохранении" } },
      { status: 500 }
    )
  }
}
