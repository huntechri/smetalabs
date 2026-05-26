import type { Role } from "@/types/roles"
import type { ApiRole } from "../types"
import type {
  PermissionDefinition,
  PermissionGroup,
  PermissionKey,
} from "../types"
import { buildPermissionGroups } from "./permission-groups"

export function buildPermissionMatrix(roles: ApiRole[]) {
  if (!roles.length) {
    return {
      accessRoles: [],
      permissionGroups: [],
      permissions: [],
      initialMatrix: {} as Record<Role, PermissionKey[]>,
    }
  }

  const accessRoles = roles.map((role) => ({
    id: role.name,
    label: role.label,
    locked: role.locked,
  }))

  const permMap = new Map<PermissionKey, PermissionDefinition>()
  for (const role of roles) {
    for (const permission of role.permissions) {
      if (!permMap.has(permission.key)) {
        permMap.set(permission.key, {
          key: permission.key,
          label: permission.label,
          group: permission.groupName,
        })
      }
    }
  }

  const permissions = Array.from(permMap.values())
  const permissionGroups = buildPermissionGroups(permissions)
  const initialMatrix = {} as Record<Role, PermissionKey[]>

  for (const role of roles) {
    initialMatrix[role.name] = role.permissions.map(
      (permission) => permission.key
    )
  }

  return { accessRoles, permissionGroups, permissions, initialMatrix }
}
