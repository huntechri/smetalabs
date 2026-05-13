/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"
import {
  canReadTeamForWorkspace,
  requireCurrentWorkspace,
} from "@/lib/auth/team"

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

async function getAuthenticatedUser() {
  const client = await createClient()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

async function getAuthEmailsByUserId(userIds: string[]) {
  const entries = await Promise.all(
    userIds.map(async (id) => {
      const { data, error } = await supabase.auth.admin.getUserById(id)

      if (error) {
        console.warn("[GET /api/team/members] Failed to load auth email", {
          userId: id,
          message: error.message,
        })
        return [id, null] as const
      }

      return [id, data.user?.email ?? null] as const
    })
  )

  return new Map(entries)
}

/** GET /api/team/members — scoped to current workspace_members.owner_id. */
export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)

    const ownerId = await requireCurrentWorkspace(user.id)
    if (!(await canReadTeamForWorkspace(user.id, ownerId))) {
      return jsonError(
        "FORBIDDEN",
        "Недостаточно прав для просмотра команды",
        403
      )
    }

    const { data: members, error: membersError } = await supabase
      .from("workspace_members")
      .select(
        "user_id,role_id,status,joined_at,last_active_at,roles!inner(name,label)"
      )
      .eq("owner_id", ownerId)
      .order("joined_at", { ascending: true })

    if (membersError) throw membersError

    const userIds = Array.from(
      new Set([ownerId, ...(members ?? []).map((m: any) => m.user_id)])
    )
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, phone, position, created_at")
      .in("id", userIds)

    if (profilesError) throw profilesError

    const authEmailMap = await getAuthEmailsByUserId(userIds)
    const profilesMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))
    const memberRows = new Map((members ?? []).map((m: any) => [m.user_id, m]))

    const rolePriority: Record<string, number> = {
      owner: 0,
      admin: 1,
      manager: 2,
      estimator: 3,
      viewer: 4,
    }

    const data = userIds
      .map((id) => {
        const profile: any = profilesMap.get(id)
        if (!profile) return null
        const member: any = memberRows.get(id)
        const role = Array.isArray(member?.roles)
          ? member.roles[0]
          : member?.roles
        const roleName =
          id === ownerId && !role?.name ? "owner" : (role?.name ?? null)
        const roleLabel =
          id === ownerId && !role?.label ? "Владелец" : (role?.label ?? null)
        const email = authEmailMap.get(id) ?? null
        const fullName =
          typeof profile.full_name === "string" ? profile.full_name.trim() : ""

        return {
          id: profile.id,
          name: fullName || email || "Без имени",
          email,
          avatarUrl: profile.avatar_url,
          phone: profile.phone,
          position: profile.position,
          primaryRole: roleName,
          primaryRoleLabel: roleLabel,
          roles: roleName
            ? [
                {
                  id: member?.role_id ?? "owner",
                  name: roleName,
                  label: roleLabel,
                },
              ].sort(
                (a, b) =>
                  (rolePriority[a.name] ?? 99) - (rolePriority[b.name] ?? 99)
              )
            : [],
          status: member?.status ?? "active",
          joinedAt: member?.joined_at ?? profile.created_at,
          lastActiveAt: member?.last_active_at ?? null,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ data, meta: { total: data.length } })
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      return jsonError("FORBIDDEN", "Нет доступа к workspace", 403)
    }

    console.error("[GET /api/team/members]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при загрузке участников", 500)
  }
}
