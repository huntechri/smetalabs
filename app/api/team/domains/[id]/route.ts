import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"

/**
 * DELETE /api/team/domains/[id]
 * Удаляет разрешённый домен по ID.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  // ── Fetch current workspace settings ──
  const { data: settingsData } = await supabase
    .from("user_settings")
    .select("workspace")
    .eq("user_id", user.id)
    .maybeSingle()

  const ws = (settingsData?.workspace ?? {}) as Record<string, any>
  const domains = (ws.domains ?? []) as any[]
  const filtered = domains.filter((d: any) => d.id !== id)

  if (filtered.length === domains.length) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Домен не найден" } },
      { status: 404 }
    )
  }

  ws.domains = filtered

  try {
    await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        workspace: ws,
        updated_at: new Date().toISOString(),
      })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[DELETE /api/team/domains/[id]] save error:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при удалении домена" } },
      { status: 500 }
    )
  }
}
