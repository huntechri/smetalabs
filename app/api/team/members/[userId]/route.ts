/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/db"
import {
  canManageTeamForWorkspace,
  getRoleId,
  getWorkspaceMemberByUser,
  requireCurrentWorkspace,
} from "@/lib/auth/team"
import { requireAuth } from "@/lib/auth/permissions"
import type { Role } from "@/types/roles"

type RouteContext = { params: Promise<{ userId: string }> }
type MemberStatus = "active" | "suspended"

const EDITABLE_ROLES: Role[] = ["admin", "manager", "estimator", "viewer"]
const EDITABLE_STATUSES: MemberStatus[] = ["active", "suspended"]

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

async function requireManagerContext() {
  const user = await requireAuth()
  const ownerId = await requireCurrentWorkspace(user.id)
  if (!(await canManageTeamForWorkspace(user.id, ownerId)))
    throw new Error("FORBIDDEN")
  return { user, ownerId }
}

async function hasOtherActiveAdmin(ownerId: string, targetUserId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id,roles!inner(name)")
    .eq("owner_id", ownerId)
    .eq("status", "active")

  if (error) throw error

  return (data ?? []).some((row: any) => {
    const role = Array.isArray(row.roles) ? row.roles[0]?.name : row.roles?.name
    return (
      row.user_id !== targetUserId && (role === "owner" || role === "admin")
    )
  })
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, ownerId } = await requireManagerContext()
    const { userId } = await params
    const body = (await request.json()) as {
      role?: Role
      status?: MemberStatus
    }

    const target = await getWorkspaceMemberByUser(userId, ownerId, true)
    if (!target)
      return jsonError(
        "NOT_FOUND",
        "Участник не найден в текущем workspace",
        404
      )
    if (userId === ownerId || target.role === "owner") {
      return jsonError("FORBIDDEN", "Нельзя изменять владельца workspace", 403)
    }

    const updates: {
      role_id?: string
      status?: MemberStatus
      updated_at: string
    } = {
      updated_at: new Date().toISOString(),
    }

    if (body.role) {
      if (!EDITABLE_ROLES.includes(body.role)) {
        return jsonError("BAD_REQUEST", "Некорректная роль", 400)
      }
      if (userId === user.id && body.role !== "admin") {
        return jsonError(
          "FORBIDDEN",
          "Нельзя понизить собственные права администратора",
          403
        )
      }
      if (target.role === "admin" && body.role !== "admin") {
        if (!(await hasOtherActiveAdmin(ownerId, userId))) {
          return jsonError(
            "FORBIDDEN",
            "Нельзя удалить последнего владельца/администратора",
            403
          )
        }
      }
      updates.role_id = await getRoleId(body.role)
    }

    if (body.status) {
      if (!EDITABLE_STATUSES.includes(body.status)) {
        return jsonError("BAD_REQUEST", "Некорректный статус", 400)
      }
      if (userId === user.id && body.status === "suspended") {
        return jsonError("FORBIDDEN", "Нельзя заблокировать самого себя", 403)
      }
      if (body.status === "suspended" && target.role === "admin") {
        if (!(await hasOtherActiveAdmin(ownerId, userId))) {
          return jsonError(
            "FORBIDDEN",
            "Нельзя заблокировать последнего владельца/администратора",
            403
          )
        }
      }
      updates.status = body.status
    }

    if (!updates.role_id && !updates.status) {
      return jsonError("BAD_REQUEST", "Нет данных для обновления", 400)
    }

    const { error } = await supabase
      .from("workspace_members")
      .update(updates)
      .eq("user_id", userId)
      .eq("owner_id", ownerId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized"))
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    if (err instanceof Error && err.message === "FORBIDDEN")
      return jsonError(
        "FORBIDDEN",
        "Недостаточно прав для управления участниками",
        403
      )
    console.error("[PATCH /api/team/members/[userId]]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при обновлении участника", 500)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { user, ownerId } = await requireManagerContext()
    const { userId } = await params

    const target = await getWorkspaceMemberByUser(userId, ownerId, true)
    if (!target)
      return jsonError(
        "NOT_FOUND",
        "Участник не найден в текущем workspace",
        404
      )
    if (userId === ownerId || target.role === "owner") {
      return jsonError("FORBIDDEN", "Нельзя удалить владельца workspace", 403)
    }
    if (userId === user.id) {
      return jsonError(
        "FORBIDDEN",
        "Нельзя удалить самого себя из управления workspace",
        403
      )
    }
    if (
      target.role === "admin" &&
      !(await hasOtherActiveAdmin(ownerId, userId))
    ) {
      return jsonError(
        "FORBIDDEN",
        "Нельзя удалить последнего владельца/администратора",
        403
      )
    }

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("user_id", userId)
      .eq("owner_id", ownerId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized"))
      return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)
    if (err instanceof Error && err.message === "FORBIDDEN")
      return jsonError(
        "FORBIDDEN",
        "Недостаточно прав для управления участниками",
        403
      )
    console.error("[DELETE /api/team/members/[userId]]", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при удалении участника", 500)
  }
}
