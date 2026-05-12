/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"
import {
  canManageTeamForWorkspace,
  canReadTeamForWorkspace,
  getPrimaryWorkspace,
  getRoleId,
} from "@/lib/auth/team"

const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["admin", "manager", "estimator", "viewer"]).default("viewer"),
  message: z.string().trim().max(1000).optional(),
})

async function getAuthenticatedUser() {
  const ssrClient = await createClient()
  const {
    data: { user },
    error,
  } = await ssrClient.auth.getUser()

  if (error || !user) return null
  return user
}

function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = forwardedHost ?? request.headers.get("host") ?? "localhost:3000"
  const proto = request.headers.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/**
 * GET /api/team/invitations
 * Возвращает список pending-приглашений текущего workspace.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)

    const ownerId = await getPrimaryWorkspace(user.id)
    if (!(await canReadTeamForWorkspace(user.id, ownerId))) {
      return jsonError(
        "FORBIDDEN",
        "Недостаточно прав для просмотра приглашений",
        403
      )
    }

    const { data, error } = await supabase
      .from("workspace_invitations")
      .select(
        "id,email,message,invited_at,expires_at,status,roles!inner(name,label),profiles!workspace_invitations_invited_by_fkey(full_name)"
      )
      .eq("owner_id", ownerId)
      .eq("status", "pending")
      .order("invited_at", { ascending: false })

    if (error) throw error

    const invitations = (data ?? []).map((inv: any) => ({
      id: inv.id,
      email: inv.email,
      role: Array.isArray(inv.roles) ? inv.roles[0]?.name : inv.roles?.name,
      roleLabel: Array.isArray(inv.roles)
        ? inv.roles[0]?.label
        : inv.roles?.label,
      invitedBy: Array.isArray(inv.profiles)
        ? inv.profiles[0]?.full_name
        : inv.profiles?.full_name,
      invitedAt: inv.invited_at,
      expiresAt: inv.expires_at,
      status: inv.status,
      message: inv.message ?? "",
    }))

    return NextResponse.json({
      data: invitations,
      meta: { total: invitations.length },
    })
  } catch (err: any) {
    console.error("[GET /api/team/invitations] error:", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при загрузке приглашений", 500)
  }
}

/**
 * POST /api/team/invitations
 * Создаёт приглашение в workspace_invitations и отправляет email через Supabase Auth.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return jsonError("UNAUTHORIZED", "Требуется аутентификация", 401)

    const body = InviteSchema.safeParse(await request.json())
    if (!body.success) {
      return jsonError(
        "BAD_REQUEST",
        body.error.issues[0]?.message ?? "Некорректные данные",
        400
      )
    }

    const ownerId = await getPrimaryWorkspace(user.id)
    if (!(await canManageTeamForWorkspace(user.id, ownerId))) {
      return jsonError(
        "FORBIDDEN",
        "Недостаточно прав для приглашения участников",
        403
      )
    }

    const { email, role, message } = body.data
    const roleId = await getRoleId(role)
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: invitation, error: insertError } = await supabase
      .from("workspace_invitations")
      .insert({
        email,
        role_id: roleId,
        invited_by: user.id,
        owner_id: ownerId,
        message: message ?? null,
        expires_at: expiresAt,
      })
      .select("id,email,message,invited_at,expires_at,status")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonError(
          "CONFLICT",
          "Приглашение для этого email уже отправлено",
          409
        )
      }
      throw insertError
    }

    const origin = getRequestOrigin(request)
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${origin}/auth/callback`,
        data: {
          invited_by: user.id,
          invitation_id: invitation.id,
          workspace_role: role,
        },
      }
    )

    if (inviteError) {
      await supabase
        .from("workspace_invitations")
        .delete()
        .eq("id", invitation.id)
        .eq("owner_id", ownerId)
      return jsonError("EMAIL_SEND_FAILED", inviteError.message, 502)
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role,
        invitedBy: user.email,
        invitedAt: invitation.invited_at,
        expiresAt: invitation.expires_at,
        status: invitation.status,
        message: invitation.message ?? "",
      },
      meta: { emailSent: true },
    })
  } catch (err: any) {
    console.error("[POST /api/team/invitations] error:", err)
    return jsonError("INTERNAL_ERROR", "Ошибка при создании приглашения", 500)
  }
}
