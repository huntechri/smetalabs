import type { DirectorySuppliersListParams } from "../types"

export const directorySuppliersQueryKeys = {
  all: ["directorySuppliers"] as const,
  lists: () => [...directorySuppliersQueryKeys.all, "list"] as const,
  list: (params: DirectorySuppliersListParams = {}) =>
    [...directorySuppliersQueryKeys.lists(), params] as const,
  details: () => [...directorySuppliersQueryKeys.all, "detail"] as const,
  detail: (id: string) =>
    [...directorySuppliersQueryKeys.details(), id] as const,
}

export const directorySuppliersCacheTags = {
  list: (workspaceOwnerId: string) => `directory-suppliers:${workspaceOwnerId}`,
  detail: (workspaceOwnerId: string, supplierId: string) =>
    `directory-supplier:${workspaceOwnerId}:${supplierId}`,
}
