import type { ProjectsListParams } from "@/types/project"
import type { ProjectEstimateRecordsListParams } from "@/types/project-estimate-record"

export const projectsQueryKeys = {
  all: ["projects"] as const,
  lists: () => [...projectsQueryKeys.all, "list"] as const,
  list: (params: ProjectsListParams = {}) => [...projectsQueryKeys.lists(), params] as const,
  detail: (id: string) => [...projectsQueryKeys.all, "detail", id] as const,
  estimateRecords: (projectId: string) =>
    [...projectsQueryKeys.detail(projectId), "estimate-records"] as const,
  estimateRecordsList: (
    projectId: string,
    params: ProjectEstimateRecordsListParams = {}
  ) => [...projectsQueryKeys.estimateRecords(projectId), "list", params] as const,
  estimateRecordContent: (projectId: string, recordId: string) =>
    [...projectsQueryKeys.estimateRecords(projectId), recordId, "content"] as const,
  estimateWorkOptions: (projectId: string, recordId: string, params: object = {}) =>
    [...projectsQueryKeys.estimateRecords(projectId), recordId, "work-options", params] as const,
  estimateMaterialOptions: (projectId: string, recordId: string, params: object = {}) =>
    [...projectsQueryKeys.estimateRecords(projectId), recordId, "material-options", params] as const,
}

export const projectsCacheTags = {
  list: (workspaceOwnerId: string) => `projects:${workspaceOwnerId}:list`,
  detail: (workspaceOwnerId: string, projectId: string) =>
    `projects:${workspaceOwnerId}:detail:${projectId}`,
}
