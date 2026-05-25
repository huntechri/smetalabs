import { createHash } from "node:crypto"
import { revalidateTag, unstable_cache } from "next/cache"
import { projectsCacheTags } from "../api/projects-query-keys"
import type {
  ProjectEstimateRecordMutationInput,
  ProjectEstimateRecordsListParams,
} from "@/types/project-estimate-record"
import {
  requireProjectsReadContext,
  requireProjectsWriteContext,
} from "./projects.service"
import {
  createProjectEstimateRecordForWorkspace,
  deleteProjectEstimateRecordForWorkspace,
  listProjectEstimateRecordsForWorkspace,
  updateProjectEstimateRecordForWorkspace,
} from "./project-estimate-records.repository"
import { normalizeProjectEstimateRecordsListParams } from "./project-estimate-records.schemas"

const LIST_CACHE_REVALIDATE_SECONDS = 30

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function estimateRecordsCacheTag(workspaceOwnerId: string, projectId: string) {
  return `projects:${workspaceOwnerId}:detail:${projectId}:estimate-records`
}

function revalidateEstimateRecords(
  workspaceOwnerId: string,
  projectId: string
) {
  revalidateTag(estimateRecordsCacheTag(workspaceOwnerId, projectId), "max")
  revalidateTag(projectsCacheTags.detail(workspaceOwnerId, projectId), "max")
  revalidateTag(projectsCacheTags.list(workspaceOwnerId), "max")
  revalidateTag(`global-purchases:${workspaceOwnerId}`, "max")
}

export async function listProjectEstimateRecords(
  projectId: string,
  params: ProjectEstimateRecordsListParams
) {
  const context = await requireProjectsReadContext()
  const normalizedParams = normalizeProjectEstimateRecordsListParams(params)
  const cacheKey = stableHash({
    workspaceOwnerId: context.workspaceOwnerId,
    projectId,
    normalizedParams,
  })

  return unstable_cache(
    () =>
      listProjectEstimateRecordsForWorkspace(
        context.workspaceOwnerId,
        projectId,
        normalizedParams
      ),
    ["project-estimate-records:list", cacheKey],
    {
      revalidate: LIST_CACHE_REVALIDATE_SECONDS,
      tags: [estimateRecordsCacheTag(context.workspaceOwnerId, projectId)],
    }
  )()
}

export async function createProjectEstimateRecord(
  projectId: string,
  input: ProjectEstimateRecordMutationInput
) {
  const context = await requireProjectsWriteContext()
  const record = await createProjectEstimateRecordForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    projectId,
    input
  )

  revalidateEstimateRecords(context.workspaceOwnerId, projectId)
  return { data: record }
}

export async function updateProjectEstimateRecord(
  projectId: string,
  recordId: string,
  input: ProjectEstimateRecordMutationInput
) {
  const context = await requireProjectsWriteContext()
  const record = await updateProjectEstimateRecordForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    projectId,
    recordId,
    input
  )

  revalidateEstimateRecords(context.workspaceOwnerId, projectId)
  return { data: record }
}

export async function deleteProjectEstimateRecord(
  projectId: string,
  recordId: string
) {
  const context = await requireProjectsWriteContext()
  const record = await deleteProjectEstimateRecordForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    projectId,
    recordId
  )

  revalidateEstimateRecords(context.workspaceOwnerId, projectId)
  return { data: record }
}
