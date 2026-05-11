import { z } from "zod"

/**
 * Schema for assigning a role to a user.
 */
export const AssignRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  roleId: z.string().uuid("Invalid role ID"),
})

export type AssignRoleInput = z.infer<typeof AssignRoleSchema>

/**
 * Schema for removing a role from a user.
 */
export const RemoveRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  roleId: z.string().uuid("Invalid role ID"),
})

export type RemoveRoleInput = z.infer<typeof RemoveRoleSchema>

/**
 * Schema for creating a new custom role.
 */
export const CreateRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(50, "Role name too long")
    .regex(/^[a-z_]+$/, "Role name must be lowercase with underscores"),
  label: z.string().min(1, "Label is required").max(100, "Label too long"),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().uuid()).default([]),
})

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>

/**
 * Schema for updating role permissions.
 */
export const UpdateRolePermissionsSchema = z.object({
  roleId: z.string().uuid("Invalid role ID"),
  permissionIds: z.array(z.string().uuid()).min(1, "At least one permission is required"),
})

export type UpdateRolePermissionsInput = z.infer<typeof UpdateRolePermissionsSchema>
