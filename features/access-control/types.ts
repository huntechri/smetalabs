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

// API-типы для клиента и хуков (вынесены сюда чтобы разорвать цикл client ↔ hook)
export type ApiPermission = {
  id: string
  key: PermissionKey
  label: string
  groupName: PermissionGroup
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
