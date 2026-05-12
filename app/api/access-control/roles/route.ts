/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/db"
import { requireAuth } from "@/lib/auth/permissions"
import {
  canReadTeamForWorkspace,
  requireCurrentWorkspace,
} from "@/lib/auth/team"

/**
 * GET /api/access-control/roles
 *
 * Возвращает все роли с их разрешениями.
 * Только чтение — без 'use server'.
 *
 * Формат ответа:
 * {
 *   "data": [ { id, name, label, locked, description, permissions: [...] } ],
 *   "meta": { "total": 5 }
 * }
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth()
    const ownerId = await requireCurrentWorkspace(user.id)
    if (!(await canReadTeamForWorkspace(user.id, ownerId))) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Недостаточно прав для просмотра ролей",
          },
        },
        { status: 403 }
      )
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json(
        {
          error: { code: "UNAUTHORIZED", message: "Требуется аутентификация" },
        },
        { status: 401 }
      )
    }
    throw err
  }

  // ── Step 0: Check env vars ──
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("[GET /api/access-control/roles] Supabase env vars not set")
    return NextResponse.json(
      {
        error: {
          code: "CONFIG_ERROR",
          message:
            "Supabase не настроен (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        },
      },
      { status: 500 }
    )
  }

  console.log(
    `[GET /api/access-control/roles] Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`
  )

  // ── Step 1: Fetch roles ──
  let allRoles
  try {
    const { data, error } = await supabase
      .from("roles")
      .select("id, name, label, locked, description, created_at")

    if (error) throw error
    allRoles = data ?? []

    console.log(
      `[GET /api/access-control/roles] roles fetched: ${allRoles.length} rows`
    )
  } catch (err: any) {
    console.error("[GET /api/access-control/roles] roles query failed:", err)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ошибка при загрузке ролей",
          details: err?.message,
        },
      },
      { status: 500 }
    )
  }

  // ── Step 2: Fetch role_permissions ──
  let allRolePerms: Array<{ role_id: string; permission_id: string }>
  try {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("role_id, permission_id")

    if (error) throw error
    allRolePerms = (data ?? []) as Array<{
      role_id: string
      permission_id: string
    }>

    console.log(
      `[GET /api/access-control/roles] role_permissions fetched: ${allRolePerms.length} rows`
    )
  } catch (err: any) {
    console.error(
      "[GET /api/access-control/roles] role_permissions query failed:",
      err
    )
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ошибка при загрузке связей ролей и разрешений",
          details: err?.message,
        },
      },
      { status: 500 }
    )
  }

  // ── Step 3: Fetch permissions ──
  let allPermissions
  try {
    const { data, error } = await supabase
      .from("permissions")
      .select("id, key, label, group_name, description")

    if (error) throw error
    allPermissions = data ?? []

    console.log(
      `[GET /api/access-control/roles] permissions fetched: ${allPermissions.length} rows`
    )
  } catch (err: any) {
    console.error(
      "[GET /api/access-control/roles] permissions query failed:",
      err
    )
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ошибка при загрузке разрешений",
          details: err?.message,
        },
      },
      { status: 500 }
    )
  }

  // ── Step 4: Build response (JS assembly вместо Drizzle JOIN) ──
  try {
    const permMap = new Map(allPermissions.map((p: any) => [p.id, p]))

    const rolePermMap = new Map<string, string[]>()
    for (const rp of allRolePerms) {
      const existing = rolePermMap.get(rp.role_id) ?? []
      existing.push(rp.permission_id)
      rolePermMap.set(rp.role_id, existing)
    }

    const data = allRoles.map((role: any) => {
      const permIds = rolePermMap.get(role.id) ?? []
      const perms = permIds
        .map((pid) => permMap.get(pid))
        .filter(Boolean)
        .map((p: any) => ({
          id: p.id,
          key: p.key,
          label: p.label,
          groupName: p.group_name,
          description: p.description,
        }))

      return {
        id: role.id,
        name: role.name,
        label: role.label,
        locked: role.locked,
        description: role.description,
        createdAt: role.created_at,
        permissions: perms,
      }
    })

    console.log(
      `[GET /api/access-control/roles] response built: ${data.length} roles`
    )

    return NextResponse.json({
      data,
      meta: {
        total: data.length,
      },
    })
  } catch (err: any) {
    console.error(
      "[GET /api/access-control/roles] response building failed:",
      err
    )
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ошибка при формировании ответа",
        },
      },
      { status: 500 }
    )
  }
}
