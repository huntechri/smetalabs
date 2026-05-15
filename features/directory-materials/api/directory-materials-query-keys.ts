import type { DirectoryMaterialsListParams } from "../types"

export const directoryMaterialsQueryKeys = {
  all: ["directoryMaterials"] as const,
  lists: () => [...directoryMaterialsQueryKeys.all, "list"] as const,
  list: (params: DirectoryMaterialsListParams = {}) =>
    [...directoryMaterialsQueryKeys.lists(), params] as const,
  details: () => [...directoryMaterialsQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...directoryMaterialsQueryKeys.details(), id] as const,
  categories: () => [...directoryMaterialsQueryKeys.all, "categories"] as const,
}

export const directoryMaterialsCacheTags = {
  list: (workspaceOwnerId: string) => `directory-materials:${workspaceOwnerId}`,
  detail: (workspaceOwnerId: string, materialId: string) =>
    `directory-material:${workspaceOwnerId}:${materialId}`,
  categories: (workspaceOwnerId: string) =>
    `directory-materials-categories:${workspaceOwnerId}`,
  aiSearchIndex: (workspaceOwnerId: string) =>
    `directory-materials-ai-index:${workspaceOwnerId}`,
}
