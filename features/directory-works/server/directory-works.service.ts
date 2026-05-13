import { revalidateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceRole, requireCurrentWorkspace } from "@/lib/auth/team"
import { DirectoryWorksApiError } from "../api/directory-works-errors"
import type {
  DirectoryWorkAiSearchInput,
  DirectoryWorkImportCreateInput,
  DirectoryWorkMutationInput,
  DirectoryWorksExportFormat,
  DirectoryWorksListParams,
} from "../types"
import { directoryWorksCacheTags } from "../api/directory-works-query-keys"
import {
  archiveDirectoryWorkForWorkspace,
  createDirectoryWorkForWorkspace,
  getDirectoryWorkCategoriesForWorkspace,
  getDirectoryWorkForWorkspace,
  listDirectoryWorksForWorkspace,
  updateDirectoryWorkForWorkspace,
} from "./directory-works.repository"
import {
  applyDirectoryWorkImportJobForWorkspace,
  createDirectoryWorkImportJobForWorkspace,
  getDirectoryWorkImportJobForWorkspace,
} from "./directory-works-import.repository"
import {
  aiSearchDirectoryWorksForWorkspace,
  enqueueDirectoryWorkEmbedding,
  enqueueDirectoryWorkEmbeddings,
  processDirectoryWorkEmbeddingQueue,
} from "./directory-works.embeddings"
import {
  buildDirectoryWorksExportFile,
  getDirectoryWorksForExport,
} from "./directory-works.export"
import { normalizeDirectoryWorksListParams } from "./directory-works.search"

type DirectoryWorksContext = {
  userId: string
  workspaceOwnerId: string
  cacheTags: {
    list: string
    categories: string
    detail: (workId: string) => string
    importJob: (jobId: string) => string
  }
}

const WRITE_ROLES = new Set(["owner", "admin", "manager"])

export async function requireDirectoryWorksReadContext(): Promise<DirectoryWorksContext> {
  const client = await createClient()
  const { data, error } = await client.auth.getUser()

  if (error || !data.user) {
    throw new DirectoryWorksApiError(
      "UNAUTHORIZED",
      "Требуется аутентификация",
      401
    )
  }

  try {
    const workspaceOwnerId = await requireCurrentWorkspace(data.user.id)

    return {
      userId: data.user.id,
      workspaceOwnerId,
      cacheTags: {
        list: directoryWorksCacheTags.list(workspaceOwnerId),
        categories: directoryWorksCacheTags.categories(workspaceOwnerId),
        detail: (workId: string) =>
          directoryWorksCacheTags.detail(workspaceOwnerId, workId),
        importJob: (jobId: string) =>
          directoryWorksCacheTags.importJob(workspaceOwnerId, jobId),
      },
    }
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      throw new DirectoryWorksApiError(
        "FORBIDDEN",
        "Нет доступа к workspace",
        403
      )
    }
    throw err
  }
}

export async function requireDirectoryWorksWriteContext(): Promise<DirectoryWorksContext> {
  const context = await requireDirectoryWorksReadContext()
  const role = await getWorkspaceRole(context.userId, context.workspaceOwnerId)

  if (!role || !WRITE_ROLES.has(role)) {
    throw new DirectoryWorksApiError(
      "FORBIDDEN",
      "Недостаточно прав для изменения справочника работ",
      403
    )
  }

  return context
}

function revalidateDirectoryWorkTags(context: DirectoryWorksContext, workId?: string) {
  revalidateTag(context.cacheTags.list, "max")
  revalidateTag(context.cacheTags.categories, "max")
  if (workId) revalidateTag(context.cacheTags.detail(workId), "max")
}

function revalidateImportTags(context: DirectoryWorksContext, jobId: string) {
  revalidateTag(context.cacheTags.importJob(jobId), "max")
}

export async function listDirectoryWorks(params: DirectoryWorksListParams) {
  const context = await requireDirectoryWorksReadContext()
  const normalizedParams = normalizeDirectoryWorksListParams(params)

  return listDirectoryWorksForWorkspace(
    context.workspaceOwnerId,
    normalizedParams
  )
}

export async function getDirectoryWork(id: string) {
  const context = await requireDirectoryWorksReadContext()
  const work = await getDirectoryWorkForWorkspace(context.workspaceOwnerId, id)

  if (!work) {
    throw new DirectoryWorksApiError("NOT_FOUND", "Работа не найдена", 404)
  }

  return {
    data: work,
    meta: {
      cacheTag: context.cacheTags.detail(work.id),
    },
  }
}

export async function createDirectoryWork(input: DirectoryWorkMutationInput) {
  const context = await requireDirectoryWorksWriteContext()
  const work = await createDirectoryWorkForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    input
  )

  await enqueueDirectoryWorkEmbedding(context.workspaceOwnerId, work)
  revalidateDirectoryWorkTags(context, work.id)
  return { data: work }
}

export async function updateDirectoryWork(
  id: string,
  input: DirectoryWorkMutationInput
) {
  const context = await requireDirectoryWorksWriteContext()
  const work = await updateDirectoryWorkForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id,
    input
  )

  await enqueueDirectoryWorkEmbedding(context.workspaceOwnerId, work)
  revalidateDirectoryWorkTags(context, work.id)
  return { data: work }
}

export async function archiveDirectoryWork(id: string) {
  const context = await requireDirectoryWorksWriteContext()
  const work = await archiveDirectoryWorkForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id
  )

  revalidateDirectoryWorkTags(context, work.id)
  return { data: work }
}

export async function getDirectoryWorksCategories(status: "active" | "archived") {
  const context = await requireDirectoryWorksReadContext()
  return getDirectoryWorkCategoriesForWorkspace(context.workspaceOwnerId, status)
}

export async function createDirectoryWorkImportJob(
  input: DirectoryWorkImportCreateInput
) {
  const context = await requireDirectoryWorksWriteContext()
  const response = await createDirectoryWorkImportJobForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    input
  )

  revalidateImportTags(context, response.data.job.id)
  return response
}

export async function getDirectoryWorkImportJob(id: string) {
  const context = await requireDirectoryWorksReadContext()
  const response = await getDirectoryWorkImportJobForWorkspace(
    context.workspaceOwnerId,
    id
  )

  if (!response) {
    throw new DirectoryWorksApiError("NOT_FOUND", "Import job не найден", 404)
  }

  return response
}

export async function applyDirectoryWorkImportJob(id: string) {
  const context = await requireDirectoryWorksWriteContext()
  const response = await applyDirectoryWorkImportJobForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id
  )
  const appliedJob = await getDirectoryWorkImportJobForWorkspace(
    context.workspaceOwnerId,
    id
  )
  const appliedWorks = await Promise.all(
    (appliedJob?.rows ?? [])
      .map((row) => row.appliedWorkId)
      .filter((workId): workId is string => Boolean(workId))
      .map((workId) => getDirectoryWorkForWorkspace(context.workspaceOwnerId, workId))
  )

  await enqueueDirectoryWorkEmbeddings(
    context.workspaceOwnerId,
    appliedWorks.filter((work): work is NonNullable<typeof work> => Boolean(work))
  )

  revalidateDirectoryWorkTags(context)
  revalidateImportTags(context, response.data.job.id)
  return response
}

export async function exportDirectoryWorks(
  format: DirectoryWorksExportFormat,
  params: DirectoryWorksListParams
) {
  const context = await requireDirectoryWorksReadContext()
  const works = await getDirectoryWorksForExport(context.workspaceOwnerId, params)
  return buildDirectoryWorksExportFile(works, format)
}

export async function aiSearchDirectoryWorks(input: DirectoryWorkAiSearchInput) {
  const context = await requireDirectoryWorksReadContext()
  return aiSearchDirectoryWorksForWorkspace(context.workspaceOwnerId, input)
}

export async function processDirectoryWorkEmbeddings(limit: number) {
  const context = await requireDirectoryWorksWriteContext()
  return processDirectoryWorkEmbeddingQueue(context.workspaceOwnerId, limit)
}
