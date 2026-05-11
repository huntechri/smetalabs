import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { roles, permissions, rolePermissions } from "@/db/schema/rbac"
import { requirePermission } from "@/lib/auth/permissions"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

// ── Schemas ──

const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(50, "Role name too long")
    .regex(/^[a-z_]+$/, "Role name must be lowercase with underscores"),
  label: z.string().min(1, "Label is required").max(100, "Label too long"),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().uuid()).default([]),
})

// ── GET /api/team/roles — list all roles with their permissions ──

export async function GET() {
  try {
    await requirePermission("team.read")

    const allRoles = await db.select().from(roles)

    const rolesWithPermissions = await Promise.all(
      allRoles.map(async (role) => {
        const perms = await db
          .select({
            id: permissions.id,
            key: permissions.key,
            label: permissions.label,
            groupName: permissions.groupName,
          })
          .from(rolePermissions)
          .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
          .where(eq(rolePermissions.roleId, role.id))

        return {
          ...role,
          permissions: perms,
        }
      })
    )

    return NextResponse.json({ roles: rolesWithPermissions })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden: insufficient permissions") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("GET /api/team/roles error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ── POST /api/team/roles — create a new role ──

export async function POST(request: NextRequest) {
  try {
    await requirePermission("team.manage")

    const body = await request.json()
    const parsed = createRoleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { name, label, description, permissionIds } = parsed.data

    // Check for duplicate role name
    const [existing] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 409 }
      )
    }

    // Validate that all permissionIds exist
    if (permissionIds.length > 0) {
      const validPerms = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(inArray(permissions.id, permissionIds))

      if (validPerms.length !== permissionIds.length) {
        return NextResponse.json(
          { error: "One or more permission IDs are invalid" },
          { status: 400 }
        )
      }
    }

    // Create the role
    const [newRole] = await db
      .insert(roles)
      .values({
        name,
        label,
        description: description ?? null,
        locked: false,
      })
      .returning()

    // Assign permissions
    if (permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map((permissionId) => ({
          roleId: newRole.id,
          permissionId,
        }))
      )
    }

    return NextResponse.json({ role: newRole }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden: insufficient permissions") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("POST /api/team/roles error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
