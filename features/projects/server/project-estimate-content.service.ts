import { revalidateTag, unstable_cache } from "next/cache"
import { projectsCacheTags } from "../api/projects-query-keys"
import { requireProjectsReadContext, requireProjectsWriteContext } from "./projects.service"
import type {
  EstimateContentChangeInput,
  EstimateContentOptionsParams,
} from "./project-estimate-content.schemas"
import {
  listProjectEstimateMaterialOptionsForWorkspace,
  listProjectEstimateWorkOptionsForWorkspace,
} from "./project-estimate-options.repository"
import {
  applyProjectEstimateContentChangeForWorkspace,
  getProjectEstimateContentForWorkspace,
} from "./project-estimate-content.repository"

const OPTIONS_CACHE_REVALIDATE_SECONDS = 30

function estimateRecordsCacheTag(workspaceOwnerId: string, projectId: string) {
  return `projects:${workspaceOwnerId}:detail:${projectId}:estimate-records`
}

function estimateOptionsCacheTag(workspaceOwnerId: string, projectId: string, recordId: string) {
  return `projects:${workspaceOwnerId}:detail:${projectId}:estimate-records:${recordId}:options`
}

function revalidateEstimateContent(workspaceOwnerId: string, projectId: string) {
  revalidateTag(projectsCacheTags.list(workspaceOwnerId), "max")
  revalidateTag(estimateRecordsCacheTag(workspaceOwnerId, projectId), "max")
  revalidateTag(projectsCacheTags.detail(workspaceOwnerId, projectId), "max")
}

export async function getProjectEstimateContent(projectId: string, recordId: string) {
  const context = await requireProjectsReadContext()
  return getProjectEstimateContentForWorkspace(context.workspaceOwnerId, projectId, recordId)
}

export async function applyProjectEstimateContentChange(
  projectId: string,
  recordId: string,
  input: EstimateContentChangeInput
) {
  const context = await requireProjectsWriteContext()
  const response = await applyProjectEstimateContentChangeForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    projectId,
    recordId,
    input
  )

  revalidateEstimateContent(context.workspaceOwnerId, projectId)
  return response
}

export async function listProjectEstimateWorkOptions(
  projectId: string,
  recordId: string,
  params: EstimateContentOptionsParams
) {
  const context = await requireProjectsReadContext()

  return unstable_cache(
    () =>
      listProjectEstimateWorkOptionsForWorkspace(
        context.workspaceOwnerId,
        projectId,
        recordId,
        params
      ),
    ["project-estimate-work-options", context.workspaceOwnerId, projectId, recordId, JSON.stringify(params)],
    {
      revalidate: OPTIONS_CACHE_REVALIDATE_SECONDS,
      tags: [estimateOptionsCacheTag(context.workspaceOwnerId, projectId, recordId)],
    }
  )()
}

export async function listProjectEstimateMaterialOptions(
  projectId: string,
  recordId: string,
  params: EstimateContentOptionsParams
) {
  const context = await requireProjectsReadContext()

  return unstable_cache(
    () =>
      listProjectEstimateMaterialOptionsForWorkspace(
        context.workspaceOwnerId,
        projectId,
        recordId,
        params
      ),
    ["project-estimate-material-options", context.workspaceOwnerId, projectId, recordId, JSON.stringify(params)],
    {
      revalidate: OPTIONS_CACHE_REVALIDATE_SECONDS,
      tags: [estimateOptionsCacheTag(context.workspaceOwnerId, projectId, recordId)],
    }
  )()
}
