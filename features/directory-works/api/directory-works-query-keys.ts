import type { DirectoryWorksListParams } from "../types"

function compactParams(params: DirectoryWorksListParams = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== ""
    )
  )
}

export const directoryWorksQueryKeys = {
  all: ["directoryWorks"] as const,
  list: (params: DirectoryWorksListParams = {}) =>
    ["directoryWorks", compactParams(params)] as const,
  detail: (id: string) => ["directoryWork", id] as const,
  categories: () => ["directoryWorksCategories"] as const,
  importJob: (id: string) => ["directoryWorksImportJob", id] as const,
}

export const directoryWorksCacheTags = {
  list: (workspaceOwnerId: string) => `directory-works:${workspaceOwnerId}`,
  detail: (workspaceOwnerId: string, workId: string) =>
    `directory-work:${workspaceOwnerId}:${workId}`,
  categories: (workspaceOwnerId: string) =>
    `directory-works-categories:${workspaceOwnerId}`,
  importJob: (workspaceOwnerId: string, jobId: string) =>
    `directory-works-import:${workspaceOwnerId}:${jobId}`,
}
