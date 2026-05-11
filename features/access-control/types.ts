export type AccessRole = "owner" | "admin" | "manager" | "estimator" | "viewer"

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
  id: AccessRole
  label: string
  locked: boolean
}

export type PermissionDefinition = {
  key: PermissionKey
  label: string
  group: PermissionGroup
}
