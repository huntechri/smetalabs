export const accessControlQueryKeys = {
  all: ["access-control"] as const,
  roles: () => [...accessControlQueryKeys.all, "roles"] as const,
}
