import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/db"
import {
  canManageTeamForWorkspace,
  canReadTeamForWorkspace,
  requireCurrentWorkspace,
} from "@/lib/auth/team"
import { requireAuth } from "@/lib/auth/permissions"

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

const DOMAIN_RE = /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/

async function requireWorkspaceAccess(manage = false) {
  const user = await requireAuth()
  const ownerId = await requireCurrentWorkspace(user.id)
  const allowed = manage
    ? await canManageTeamForWorkspace(user.id, ownerId)
    : await canReadTeamForWorkspace(user.id, ownerId)
  if (!allowed) throw new Error("FORBIDDEN")
  return { user, ownerId }
}

export async function GET() {
  try {
    const { ownerId } = await requireWorkspaceAccess(false)
    const { data, error } = await supabase
      .from("workspace_allowed_domains")
      .select("id,domain,added_by,added_at")
      .eq("owner_id", ownerId)
      .order("added_at", { ascending: false })

    if (error) throw error

    const addedByIds = [
      ...new Set((data ?? []).map((row) => row.added_by).filter(Boolean)),
    ]
    const { data: profiles, error: profilesError } = addedByIds.length
      ? await supabase
          .from("profiles")
          .select("id,full_name,email")
          .in("id", addedByIds)
      : { data: [], error: null }

    if (profilesError) throw profilesError

    const profilesById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile])
    )
    const domains = (data ?? []).map((row) => ({
      id: row.id,
      domain: row.domain,
      addedBy:
        profilesById.get(row.added_by ?? "")?.full_name ??
        profilesById.get(row.added_by ?? "")?.email ??
        "System",
      addedAt: row.added_at,
    }))

    return NextResponse.json({
      data: domains,
      meta: { autoJoinDomains: false },
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized"))
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    if (err instanceof Error && err.message === "FORBIDDEN")
      return jsonError("FORBIDDEN", "Недостаточно прав", 403)
    console.error("[GET /api/team/domains]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при загрузке доменов", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, ownerId } = await requireWorkspaceAccess(true)
    const body = (await request.json()) as { domain?: string }
    const domain = (body.domain ?? "").trim().toLowerCase()
    if (!DOMAIN_RE.test(domain))
      return jsonError("BAD_REQUEST", "Некорректный домен", 400)

    const { data, error } = await supabase
      .from("workspace_allowed_domains")
      .insert({ domain, owner_id: ownerId, added_by: user.id })
      .select("id,domain,added_at")
      .single()

    if (error) {
      if (error.code === "23505")
        return jsonError("CONFLICT", "Домен уже добавлен", 409)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        domain: data.domain,
        addedBy: user.email ?? "System",
        addedAt: data.added_at,
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized"))
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    if (err instanceof Error && err.message === "FORBIDDEN")
      return jsonError("FORBIDDEN", "Недостаточно прав", 403)
    console.error("[POST /api/team/domains]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при сохранении домена", 500)
  }
}

export async function PATCH(_request: NextRequest) {
  try {
    await requireWorkspaceAccess(true)
    return jsonError(
      "NOT_IMPLEMENTED",
      "Автоприсоединение по домену ещё не реализовано",
      501
    )
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized"))
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    if (err instanceof Error && err.message === "FORBIDDEN")
      return jsonError("FORBIDDEN", "Недостаточно прав", 403)
    return jsonError("INTERNAL_ERROR", "Ошибка обработки запроса", 500)
  }
}
