import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"

/**
 * GET /api/team/overview
 *
 * Возвращает обзорную информацию о workspace:
 * название, slug, компания, владелец, тариф, количество участников.
 */
export async function GET() {
  // ── Auth check ──
  let ssrClient
  try {
    ssrClient = await createClient()
  } catch (err) {
    console.error("[GET /api/team/overview] createClient failed:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при создании клиента" } },
      { status: 500 }
    )
  }

  let user
  try {
    const result = await ssrClient.auth.getUser()
    user = result.data?.user ?? null
  } catch (err) {
    console.error("[GET /api/team/overview] getUser threw:", err)
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

  // ── Fetch profiles ──
  let allProfiles
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, workspace_name")

    if (error) throw error
    allProfiles = data ?? []
  } catch (err: any) {
    console.error("[GET /api/team/overview] profiles query failed:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при загрузке профилей" } },
      { status: 500 }
    )
  }

  // ── Fetch user_roles for owner detection ──
  let allUserRoles
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id, role_id")

    if (error) throw error
    allUserRoles = data ?? []
  } catch (err: any) {
    console.error("[GET /api/team/overview] user_roles query failed:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ошибка при загрузке ролей" } },
      { status: 500 }
    )
  }

  // ── Fetch roles for owner detection ──
  let ownerRoleId: string | null = null
  try {
    const { data: rolesData, error: rolesErr } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "owner")
      .single()

    if (!rolesErr && rolesData) {
      ownerRoleId = rolesData.id
    }
  } catch {
    // ignore — fallback to first profile as owner
  }

  // ── Resolve owner ──
  let ownerName = "—"
  if (ownerRoleId) {
    const ownerUserId = allUserRoles.find((ur: any) => ur.role_id === ownerRoleId)?.user_id
    if (ownerUserId) {
      ownerName = allProfiles.find((p: any) => p.id === ownerUserId)?.full_name ?? "—"
    }
  } else {
    // Fallback: first profile
    ownerName = allProfiles[0]?.full_name ?? "—"
  }

  // ── Fetch current user's profile for workspace name ──
  const currentProfile = allProfiles.find((p: any) => p.id === user.id)
  const wsName = currentProfile?.workspace_name ?? "SmetaLabs Studio"

  // ── Fetch user_settings for plan/limits ──
  let planName = "Pro"
  let memberLimit = 15
  try {
    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("workspace")
      .eq("user_id", user.id)
      .maybeSingle()

    if (settingsData?.workspace) {
      const ws = settingsData.workspace as any
      planName = ws.planName ?? "Pro"
      memberLimit = ws.memberLimit ?? 15
    }
  } catch {
    // use defaults
  }

  const totalMembers = allProfiles.length

  return NextResponse.json({
    data: {
      name: wsName,
      slug: (wsName as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-zа-яё0-9-]/g, ""),
      companyName: wsName,
      ownerName,
      planName,
      memberLimit,
      currentMembers: totalMembers,
    },
  })
}
