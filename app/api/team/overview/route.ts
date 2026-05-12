/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"
import {
  canReadTeamForWorkspace,
  requireCurrentWorkspace,
} from "@/lib/auth/team"

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/** GET /api/team/overview — scoped to current workspace_members.owner_id. */
export async function GET() {
  try {
    const client = await createClient()
    const { data } = await client.auth.getUser()
    const user = data.user
    if (!user) return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)

    const ownerId = await requireCurrentWorkspace(user.id)
    if (!(await canReadTeamForWorkspace(user.id, ownerId))) {
      return jsonError(
        "FORBIDDEN",
        "Недостаточно прав для просмотра workspace",
        403
      )
    }

    const [
      { data: ownerProfile, error: profileError },
      { count, error: countError },
      { data: settingsData },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, workspace_name")
        .eq("id", ownerId)
        .maybeSingle(),
      supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId),
      supabase
        .from("user_settings")
        .select("workspace")
        .eq("user_id", ownerId)
        .maybeSingle(),
    ])

    if (profileError) throw profileError
    if (countError) throw countError

    const ws = (settingsData?.workspace ?? {}) as Record<string, any>
    const wsName =
      ownerProfile?.workspace_name ?? ws.workspaceName ?? "SmetaLabs Studio"
    const currentMembers = Math.max(count ?? 0, 1)

    return NextResponse.json({
      data: {
        name: wsName,
        slug: String(wsName)
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-zа-яё0-9-]/g, ""),
        companyName: ws.companyLegalName ?? wsName,
        ownerName: ownerProfile?.full_name ?? "—",
        planName: ws.planName ?? "Pro",
        memberLimit: ws.memberLimit ?? 15,
        currentMembers,
      },
    })
  } catch (err) {
    console.error("[GET /api/team/overview]", err)
    return jsonError(
      "INTERNAL_ERROR",
      "Ошибка при загрузке обзора workspace",
      500
    )
  }
}
