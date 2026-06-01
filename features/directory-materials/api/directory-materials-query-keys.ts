import type {
  DirectoryMaterialsCategoriesParams,
  DirectoryMaterialsListParams,
} from "../model/directory-materials-model"

export const directoryMaterialsQueryKeys = {
  all: ["directoryMaterials"] as const,
  lists: () => [...directoryMaterialsQueryKeys.all, "list"] as const,
  list: (params: DirectoryMaterialsListParams = {}) =>
    [...directoryMaterialsQueryKeys.lists(), params] as const,
  details: () => [...directoryMaterialsQueryKeys.all, "detail"] as const,
  detail: (id: string) =>
    [...directoryMaterialsQueryKeys.details(), id] as const,
  categories: (params: DirectoryMaterialsCategoriesParams = {}) =>
    [...directoryMaterialsQueryKeys.all, "categories", params] as const,
  importJobs: () => [...directoryMaterialsQueryKeys.all, "importJob"] as const,
  importJob: (id: string) =>
    [...directoryMaterialsQueryKeys.importJobs(), id] as const,
}

export const directoryMaterialsCacheTags = {
  list: (workspaceOwnerId: string) => `directory-materials:${workspaceOwnerId}`,
  detail: (workspaceOwnerId: string, materialId: string) =>
    `directory-material:${workspaceOwnerId}:${materialId}`,
  categories: (workspaceOwnerId: string) =>
    `directory-materials-categories:${workspaceOwnerId}`,
  importJob: (workspaceOwnerId: string, jobId: string) =>
    `directory-materials-import:${workspaceOwnerId}:${jobId}`,
  aiSearchIndex: (workspaceOwnerId: string) =>
    `directory-materials-ai-index:${workspaceOwnerId}`,
}
