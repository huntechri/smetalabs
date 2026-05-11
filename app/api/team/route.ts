import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { userRoles, roles } from "@/db/schema/rbac"
import { profiles } from "@/db/schema/profiles"
import { requirePermission } from "@/lib/auth/permissions"
import { createClient } from "@/lib/supabase/server"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

// ── Schemas ──

const assignRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  roleId: z.string().uuid("Invalid role ID"),
})

const removeRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  roleId: z.string().uuid("Invalid role ID"),
})

// ── GET /api/team — list team members ──

export async function GET() {
  try {
    await requirePermission("team.read")

    const members = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        email: profiles.fullName, // placeholder; real email from auth.users
        avatarUrl: profiles.avatarUrl,
        roleId: roles.id,
        roleName: roles.name,
        roleLabel: roles.label,
      })
      .from(profiles)
      .innerJoin(userRoles, eq(userRoles.userId, profiles.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))

    // Group roles per user
    const grouped = new Map<
      string,
      {
        id: string
        fullName: string | null
        email: string | null
        avatarUrl: string | null
        roles: { id: string; name: string; label: string }[]
      }
    >()

    for (const m of members) {
      if (!grouped.has(m.id)) {
        grouped.set(m.id, {
          id: m.id,
          fullName: m.fullName,
          email: m.email,
          avatarUrl: m.avatarUrl,
          roles: [],
        })
      }
      grouped.get(m.id)!.roles.push({
        id: m.roleId,
        name: m.roleName,
        label: m.roleLabel,
      })
    }

    return NextResponse.json({ members: Array.from(grouped.values()) })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden: insufficient permissions") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("GET /api/team error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ── POST /api/team — assign a role to a user ──

export async function POST(request: NextRequest) {
  try {
    await requirePermission("team.manage")

    const body = await request.json()
    const parsed = assignRoleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { userId, roleId } = parsed.data

    // Check if the role is locked
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    if (role.locked) {
      return NextResponse.json(
        { error: "Cannot manually assign a locked role" },
        { status: 403 }
      )
    }

    // Check if user already has this role
    const [existing] = await db
      .select()
      .from(userRoles)
      .where(
        and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId))
      )
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: "User already has this role" },
        { status: 409 }
      )
    }

    // Assign role
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await db.insert(userRoles).values({
      userId,
      roleId,
      assignedBy: user?.id ?? null,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden: insufficient permissions") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("POST /api/team error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ── DELETE /api/team — remove a role from a user ──

export async function DELETE(request: NextRequest) {
  try {
    await requirePermission("team.manage")

    const body = await request.json()
    const parsed = removeRoleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { userId, roleId } = parsed.data

    // Check if the role is locked
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    if (role.locked) {
      return NextResponse.json(
        { error: "Cannot remove a locked role" },
        { status: 403 }
      )
    }

    await db
      .delete(userRoles)
      .where(
        and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId))
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden: insufficient permissions") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("DELETE /api/team error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
