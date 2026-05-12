import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"

/**
 * GET /api/team/invitations
 * Возвращает список ожидающих приглашений.
 *
 * POST /api/team/invitations
 * Создаёт новое приглашение.
 * Тело: { email: string, role: string, message?: string }
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
    const invitations = (ws.invitations ?? []) as any[]

    return NextResponse.json({
      data: invitations,
      meta: { total: invitations.length },
    })
  } catch (err: any) {
    console.error("[GET /api/team/invitations] error:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при загрузке приглашений" } },
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

  let body: { email: string; role: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Некорректный JSON" } },
      { status: 400 }
    )
  }

  const email = (body.email ?? "").trim().toLowerCase()
  const validRoles = ["admin", "manager", "estimator", "viewer"]
  const role = body.role ?? "viewer"

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Некорректный email" } },
      { status: 400 }
    )
  }

  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Недопустимая роль" } },
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
  const invitations = (ws.invitations ?? []) as any[]

  // Check duplicate
  if (invitations.some((inv: any) => inv.email === email && inv.status === "pending")) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Приглашение для этого email уже отправлено" } },
      { status: 409 }
    )
  }

  // ── Fetch current user's profile name ──
  let inviterName = user.email ?? "System"
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
    if (profile?.full_name) inviterName = profile.full_name
  } catch {
    // use email
  }

  const newInvitation = {
    id: crypto.randomUUID(),
    email,
    role,
    invitedBy: inviterName,
    invitedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    message: body.message ?? "",
  }

  invitations.push(newInvitation)
  ws.invitations = invitations

  try {
    // Сохраняем приглашение в БД
    await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        workspace: ws,
        updated_at: new Date().toISOString(),
      })

    // Отправляем реальное email-приглашение через Supabase Auth Admin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    let emailSent = false
    try {
      const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/signup?invite=${newInvitation.id}`,
        data: {
          invited_by: user.id,
          workspace_role: role,
          invitation_id: newInvitation.id,
        },
      })
      if (inviteErr) {
        // Если пользователь уже существует — не ошибка, приглашение всё равно в БД
        console.warn(
          "[POST /api/team/invitations] inviteUserByEmail warning:",
          inviteErr.message
        )
      } else {
        emailSent = true
      }
    } catch (emailErr: any) {
      console.warn(
        "[POST /api/team/invitations] inviteUserByEmail threw:",
        emailErr?.message ?? emailErr
      )
    }

    return NextResponse.json({
      success: true,
      data: newInvitation,
      meta: { emailSent },
    })
  } catch (err: any) {
    console.error("[POST /api/team/invitations] save error:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при создании приглашения" } },
      { status: 500 }
    )
  }
}
