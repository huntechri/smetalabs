import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/db"
import { canManageTeam, requireAuth } from "@/lib/auth/permissions"
import type { Role } from "@/types/roles"

type RouteContext = { params: Promise<{ userId: string }> }
type MemberStatus = "active" | "suspended"

const EDITABLE_ROLES: Role[] = ["admin", "manager", "estimator", "viewer"]
const EDITABLE_STATUSES: MemberStatus[] = ["active", "suspended"]

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

async function assertCanManageMembers() {
  const user = await requireAuth()
  if (!(await canManageTeam())) {
    throw new Error("FORBIDDEN")
  }
  return user
}

async function getUserPrimaryRole(userId: string): Promise<Role | null> {
  const { data: userRoleRows, error } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId)

  if (error) throw error
  if (!userRoleRows?.length) return null

  const roleIds = userRoleRows.map((r: { role_id: string }) => r.role_id)
  const { data: roleRows, error: rolesError } = await supabase
    .from("roles")
    .select("id, name")
    .in("id", roleIds)

  if (rolesError) throw rolesError

  const rolePriority: Record<Role, number> = {
    owner: 0,
    admin: 1,
    manager: 2,
    estimator: 3,
    viewer: 4,
  }

  const sorted = (roleRows ?? [])
    .map((role: { name: string }) => role.name as Role)
    .filter((role: Role) => role in rolePriority)
    .sort((a: Role, b: Role) => rolePriority[a] - rolePriority[b])

  return sorted[0] ?? null
}

async function getRoleId(role: Role): Promise<string | null> {
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", role)
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}

async function ensureMemberExists(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

async function updateWorkspaceMember(
  userId: string,
  ownerId: string,
  updates: { role_id?: string; status?: MemberStatus }
) {
  const { data: existing, error: selectError } = await supabase
    .from("workspace_members")
    .select("id, role_id, status")
    .eq("user_id", userId)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing?.id) {
    const { error } = await supabase
      .from("workspace_members")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", existing.id)

    if (error) throw error
    return
  }

  const fallbackRoleId = updates.role_id ?? (await getRoleId("viewer"))
  if (!fallbackRoleId) throw new Error("ROLE_NOT_FOUND")

  const { error } = await supabase
    .from("workspace_members")
    .insert({
      user_id: userId,
      owner_id: ownerId,
      role_id: fallbackRoleId,
      status: updates.status ?? "active",
      joined_at: new Date().toISOString(),
    })

  if (error) throw error
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await assertCanManageMembers()
    const { userId } = await params
    const body = (await request.json()) as { role?: Role; status?: MemberStatus }

    if (!(await ensureMemberExists(userId))) {
      return jsonError("NOT_FOUND", "Участник не найден", 404)
    }

    if ((await getUserPrimaryRole(userId)) === "owner") {
      return jsonError("FORBIDDEN", "Нельзя изменять владельца workspace", 403)
    }

    const updates: { role_id?: string; status?: MemberStatus } = {}

    if (body.role) {
      if (!EDITABLE_ROLES.includes(body.role)) {
        return jsonError("BAD_REQUEST", "Некорректная роль", 400)
      }

      const roleId = await getRoleId(body.role)
      if (!roleId) return jsonError("NOT_FOUND", "Роль не найдена", 404)

      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
      if (deleteError) throw deleteError

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role_id: roleId, assigned_by: currentUser.id })
      if (insertError) throw insertError

      updates.role_id = roleId
    }

    if (body.status) {
      if (!EDITABLE_STATUSES.includes(body.status)) {
        return jsonError("BAD_REQUEST", "Некорректный статус", 400)
      }
      updates.status = body.status
    }

    if (!updates.role_id && !updates.status) {
      return jsonError("BAD_REQUEST", "Нет данных для обновления", 400)
    }

    await updateWorkspaceMember(userId, currentUser.id, updates)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return jsonError("FORBIDDEN", "Недостаточно прав для управления участниками", 403)
    }

    console.error("[PATCH /api/team/members/[userId]]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при обновлении участника", 500)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    await assertCanManageMembers()
    const { userId } = await params

    if (!(await ensureMemberExists(userId))) {
      return jsonError("NOT_FOUND", "Участник не найден", 404)
    }

    if ((await getUserPrimaryRole(userId)) === "owner") {
      return jsonError("FORBIDDEN", "Нельзя удалить владельца workspace", 403)
    }

    const { error: workspaceError } = await supabase
      .from("workspace_members")
      .delete()
      .eq("user_id", userId)
    if (workspaceError) throw workspaceError

    const { error: rolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
    if (rolesError) throw rolesError

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return jsonError("FORBIDDEN", "Недостаточно прав для управления участниками", 403)
    }

    console.error("[DELETE /api/team/members/[userId]]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при удалении участника", 500)
  }
}
