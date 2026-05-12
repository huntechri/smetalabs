import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"

/**
 * GET /api/team/domains
 * Возвращает список разрешённых доменов и настройку auto-join.
 *
 * POST /api/team/domains
 * Добавляет новый разрешённый домен.
 * Тело: { domain: string }
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

  // ── Fetch from user_settings ──
  try {
    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("workspace")
      .eq("user_id", user.id)
      .maybeSingle()

    const ws = (settingsData?.workspace ?? {}) as Record<string, any>
    const domains = (ws.domains ?? []) as any[]
    const autoJoin = ws.autoJoinDomains ?? false

    return NextResponse.json({
      data: domains,
      meta: { autoJoinDomains: autoJoin },
    })
  } catch (err: any) {
    console.error("[GET /api/team/domains] error:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при загрузке доменов" } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

  let body: { domain: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Некорректный JSON" } },
      { status: 400 }
    )
  }

  const domain = (body.domain ?? "").trim().toLowerCase()
  if (!domain || !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Некорректный домен" } },
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
  const domains = (ws.domains ?? []) as any[]

  // Check for duplicate
  if (domains.some((d: any) => d.domain === domain)) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Домен уже добавлен" } },
      { status: 409 }
    )
  }

  const newDomain = {
    id: crypto.randomUUID(),
    domain,
    addedBy: user.email ?? "System",
    addedAt: new Date().toISOString(),
  }

  domains.push(newDomain)
  ws.domains = domains

  try {
    await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        workspace: ws,
        updated_at: new Date().toISOString(),
      })

    return NextResponse.json({
      success: true,
      data: newDomain,
    })
  } catch (err: any) {
    console.error("[POST /api/team/domains] save error:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при сохранении" } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/team/domains
 * Обновляет настройку auto-join для разрешённых доменов.
 * Тело: { autoJoinDomains: boolean }
 */
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

  let body: { autoJoinDomains: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Некорректный JSON" } },
      { status: 400 }
    )
  }

  if (typeof body.autoJoinDomains !== "boolean") {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "autoJoinDomains должен быть boolean" } },
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
  ws.autoJoinDomains = body.autoJoinDomains

  try {
    await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        workspace: ws,
        updated_at: new Date().toISOString(),
      })

    return NextResponse.json({
      success: true,
      data: { autoJoinDomains: body.autoJoinDomains },
    })
  } catch (err: any) {
    console.error("[PATCH /api/team/domains] save error:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при сохранении" } },
      { status: 500 }
    )
  }
}
