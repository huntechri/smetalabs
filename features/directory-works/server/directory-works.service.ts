import { createHash } from "node:crypto"
import { revalidateTag, unstable_cache } from "next/cache"
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
import { measureDirectoryWorksOperation } from "./directory-works.observability"
import { normalizeDirectoryWorksListParams } from "./directory-works.search"

type DirectoryWorksContext = {
  userId: string
  workspaceOwnerId: string
  cacheTags: {
    list: string
    categories: string
    detail: (workId: string) => string
    importJob: (jobId: string) => string
    aiSearchIndex: string
  }
}

const WRITE_ROLES = new Set(["owner", "admin", "manager"])
const LIST_CACHE_REVALIDATE_SECONDS = 30
const DETAIL_CACHE_REVALIDATE_SECONDS = 120
const CATEGORIES_CACHE_REVALIDATE_SECONDS = 300
const AI_SEARCH_CACHE_REVALIDATE_SECONDS = 30

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

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
        aiSearchIndex: directoryWorksCacheTags.aiSearchIndex(workspaceOwnerId),
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
  revalidateTag(context.cacheTags.aiSearchIndex, "max")
  if (workId) revalidateTag(context.cacheTags.detail(workId), "max")
}

function revalidateImportTags(context: DirectoryWorksContext, jobId: string) {
  revalidateTag(context.cacheTags.importJob(jobId), "max")
}

export async function listDirectoryWorks(params: DirectoryWorksListParams) {
  const context = await requireDirectoryWorksReadContext()
  const normalizedParams = normalizeDirectoryWorksListParams(params)
  const cacheKey = stableHash({ workspaceOwnerId: context.workspaceOwnerId, normalizedParams })

  return measureDirectoryWorksOperation(
    "list",
    {
      workspaceOwnerId: context.workspaceOwnerId,
      limit: normalizedParams.limit,
      hasQuery: Boolean(normalizedParams.q),
      cache: "miss",
    },
    () =>
      unstable_cache(
        () => listDirectoryWorksForWorkspace(context.workspaceOwnerId, normalizedParams),
        ["directory-works:list", cacheKey],
        {
          revalidate: LIST_CACHE_REVALIDATE_SECONDS,
          tags: [context.cacheTags.list],
        }
      )()
  )
}

export async function getDirectoryWork(id: string) {
  const context = await requireDirectoryWorksReadContext()
  const work = await measureDirectoryWorksOperation(
    "detail",
    { workspaceOwnerId: context.workspaceOwnerId, workId: id, cache: "miss" },
    () =>
      unstable_cache(
        () => getDirectoryWorkForWorkspace(context.workspaceOwnerId, id),
        ["directory-works:detail", context.workspaceOwnerId, id],
        {
          revalidate: DETAIL_CACHE_REVALIDATE_SECONDS,
          tags: [context.cacheTags.detail(id), context.cacheTags.list],
        }
      )()
  )

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
  const work = await measureDirectoryWorksOperation(
    "create",
    { workspaceOwnerId: context.workspaceOwnerId, cache: "bypass" },
    () =>
      createDirectoryWorkForWorkspace(
        context.workspaceOwnerId,
        context.userId,
        input
      )
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
  const work = await measureDirectoryWorksOperation(
    "update",
    { workspaceOwnerId: context.workspaceOwnerId, workId: id, cache: "bypass" },
    () =>
      updateDirectoryWorkForWorkspace(
        context.workspaceOwnerId,
        context.userId,
        id,
        input
      )
  )

  revalidateDirectoryWorkTags(context, work.id)
  return { data: work }
}

export async function archiveDirectoryWork(id: string) {
  const context = await requireDirectoryWorksWriteContext()
  const work = await measureDirectoryWorksOperation(
    "archive",
    { workspaceOwnerId: context.workspaceOwnerId, workId: id, cache: "bypass" },
    () =>
      archiveDirectoryWorkForWorkspace(
        context.workspaceOwnerId,
        context.userId,
        id
      )
  )

  revalidateDirectoryWorkTags(context, work.id)
  return { data: work }
}

export async function getDirectoryWorksCategories(status: "active" | "archived") {
  const context = await requireDirectoryWorksReadContext()

  return measureDirectoryWorksOperation(
    "categories",
    { workspaceOwnerId: context.workspaceOwnerId, cache: "miss" },
    () =>
      unstable_cache(
        () => getDirectoryWorkCategoriesForWorkspace(context.workspaceOwnerId, status),
        ["directory-works:categories", context.workspaceOwnerId, status],
        {
          revalidate: CATEGORIES_CACHE_REVALIDATE_SECONDS,
          tags: [context.cacheTags.categories, context.cacheTags.list],
        }
      )()
  )
}

export async function createDirectoryWorkImportJob(
  input: DirectoryWorkImportCreateInput
) {
  const context = await requireDirectoryWorksWriteContext()
  const response = await measureDirectoryWorksOperation(
    "import.create",
    {
      workspaceOwnerId: context.workspaceOwnerId,
      rows: input.rows.length,
      cache: "bypass",
    },
    () =>
      createDirectoryWorkImportJobForWorkspace(
        context.workspaceOwnerId,
        context.userId,
        input
      )
  )

  revalidateImportTags(context, response.data.job.id)
  return response
}

export async function getDirectoryWorkImportJob(id: string) {
  const context = await requireDirectoryWorksReadContext()
  const response = await measureDirectoryWorksOperation(
    "import.detail",
    { workspaceOwnerId: context.workspaceOwnerId, jobId: id, cache: "bypass" },
    () =>
      getDirectoryWorkImportJobForWorkspace(
        context.workspaceOwnerId,
        id
      )
  )

  if (!response) {
    throw new DirectoryWorksApiError("NOT_FOUND", "Import job не найден", 404)
  }

  return response
}

export async function applyDirectoryWorkImportJob(id: string) {
  const context = await requireDirectoryWorksWriteContext()
  const response = await measureDirectoryWorksOperation(
    "import.apply",
    { workspaceOwnerId: context.workspaceOwnerId, jobId: id, cache: "bypass" },
    () =>
      applyDirectoryWorkImportJobForWorkspace(
        context.workspaceOwnerId,
        context.userId,
        id
      )
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
  const works = await measureDirectoryWorksOperation(
    "export",
    { workspaceOwnerId: context.workspaceOwnerId, format, cache: "bypass" },
    () => getDirectoryWorksForExport(context.workspaceOwnerId, params)
  )
  return buildDirectoryWorksExportFile(works, format)
}

export async function aiSearchDirectoryWorks(input: DirectoryWorkAiSearchInput) {
  const context = await requireDirectoryWorksReadContext()
  const normalizedInput = {
    ...input,
    query: input.query.trim().replace(/\s+/g, " "),
    limit: input.limit ?? 20,
    threshold: input.threshold,
  }
  const queryHash = stableHash({ workspaceOwnerId: context.workspaceOwnerId, input: normalizedInput })
  const queryTag = directoryWorksCacheTags.aiSearch(context.workspaceOwnerId, queryHash)

  return measureDirectoryWorksOperation(
    "ai.search",
    {
      workspaceOwnerId: context.workspaceOwnerId,
      limit: normalizedInput.limit,
      hasQuery: Boolean(normalizedInput.query),
      cache: "miss",
    },
    () =>
      unstable_cache(
        () => aiSearchDirectoryWorksForWorkspace(context.workspaceOwnerId, normalizedInput),
        ["directory-works:ai-search", queryHash],
        {
          revalidate: AI_SEARCH_CACHE_REVALIDATE_SECONDS,
          tags: [queryTag, context.cacheTags.aiSearchIndex, context.cacheTags.list],
        }
      )()
  )
}

export async function processDirectoryWorkEmbeddings(limit: number) {
  const context = await requireDirectoryWorksWriteContext()
  const response = await measureDirectoryWorksOperation(
    "embeddings.process",
    { workspaceOwnerId: context.workspaceOwnerId, limit, cache: "bypass" },
    () => processDirectoryWorkEmbeddingQueue(context.workspaceOwnerId, limit)
  )

  if (response.data.processed > 0 || response.data.failed > 0) {
    revalidateTag(context.cacheTags.aiSearchIndex, "max")
  }

  return response
}
