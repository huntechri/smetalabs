import type { Role } from "@/types/roles"

export type PermissionGroup =
  | "projects"
  | "estimates"
  | "purchases"
  | "team"
  | "billing"

export type PermissionKey =
  | "projects.read"
  | "projects.create"
  | "projects.update"
  | "projects.delete"
  | "estimates.read"
  | "estimates.create"
  | "estimates.update"
  | "estimates.delete"
  | "purchases.read"
  | "purchases.create"
  | "purchases.update"
  | "purchases.delete"
  | "team.read"
  | "team.create"
  | "team.update"
  | "team.delete"
  | "team.manage"
  | "billing.read"
  | "billing.manage"

export type RoleDefinition = {
  id: Role
  label: string
  locked: boolean
}

export type PermissionDefinition = {
  key: PermissionKey
  label: string
  group: PermissionGroup
}

export type ApiPermission = {
  id: string
  key: string
  label: string
  groupName: string
  description?: string | null
}

export type ApiRole = {
  id: string
  name: Role
  label: string
  locked: boolean
  description?: string | null
  permissions: ApiPermission[]
}

export type PermissionGroupDefinition = {
  id: string
  label: string
}

const GROUP_LABELS: Record<string, string> = {
  projects: "Проекты",
  estimates: "Сметы",
  purchases: "Закупки",
  team: "Команда",
  billing: "Биллинг",
}

export function buildPermissionGroups(
  permissions: Pick<PermissionDefinition, "group">[]
): PermissionGroupDefinition[] {
  const groupNames = Array.from(new Set(permissions.map((p) => p.group)))
  return groupNames.map((group) => ({
    id: group,
    label: GROUP_LABELS[group] ?? group,
  }))
}

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

  const permMap = new Map<string, PermissionDefinition>()
  for (const role of roles) {
    for (const permission of role.permissions) {
      if (!permMap.has(permission.key)) {
        permMap.set(permission.key, {
          key: permission.key as PermissionKey,
          label: permission.label,
          group: permission.groupName as PermissionGroup,
        })
      }
    }
  }

  const permissions = Array.from(permMap.values())
  const permissionGroups = buildPermissionGroups(permissions)
  const initialMatrix = {} as Record<Role, PermissionKey[]>

  for (const role of roles) {
    initialMatrix[role.name] = role.permissions.map(
      (permission) => permission.key as PermissionKey
    )
  }

  return { accessRoles, permissionGroups, permissions, initialMatrix }
}
