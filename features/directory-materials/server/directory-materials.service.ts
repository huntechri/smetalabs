import { createHash } from "node:crypto"
import { revalidateTag, unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceRole, requireCurrentWorkspace } from "@/lib/auth/team"
import { DirectoryMaterialsApiError } from "../api/directory-materials-errors"
import { directoryMaterialsCacheTags } from "../api/directory-materials-query-keys"
import type {
  DirectoryMaterialImportCreateInput,
  DirectoryMaterialMutationInput,
  DirectoryMaterialsExportFormat,
  DirectoryMaterialsListParams,
} from "../types"
import {
  archiveDirectoryMaterialForWorkspace,
  createDirectoryMaterialForWorkspace,
  getDirectoryMaterialCategoriesForWorkspace,
  getDirectoryMaterialForWorkspace,
  listDirectoryMaterialsForWorkspace,
  updateDirectoryMaterialForWorkspace,
} from "./directory-materials.repository"
import {
  applyDirectoryMaterialImportJobForWorkspace,
  createDirectoryMaterialImportJobForWorkspace,
  getDirectoryMaterialImportJobForWorkspace,
} from "./directory-materials-import.repository"
import {
  enqueueDirectoryMaterialEmbeddingForWorkspace,
  processDirectoryMaterialEmbeddingsForWorkspace,
  searchDirectoryMaterialsAiForWorkspace,
} from "./directory-materials-ai"
import { buildDirectoryMaterialsExportFile } from "./directory-materials.export"
import { normalizeDirectoryMaterialsListParams } from "./directory-materials.schemas"

type DirectoryMaterialsContext = {
  userId: string
  workspaceOwnerId: string
  cacheTags: {
    list: string
    categories: string
    detail: (materialId: string) => string
    importJob: (jobId: string) => string
    aiSearchIndex: string
  }
}

const WRITE_ROLES = new Set(["owner", "admin", "manager"])
const LIST_CACHE_REVALIDATE_SECONDS = 30
const DETAIL_CACHE_REVALIDATE_SECONDS = 120
const CATEGORIES_CACHE_REVALIDATE_SECONDS = 300

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export async function requireDirectoryMaterialsReadContext(): Promise<DirectoryMaterialsContext> {
  const client = await createClient()
  const { data, error } = await client.auth.getUser()

  if (error || !data.user) {
    throw new DirectoryMaterialsApiError(
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
        list: directoryMaterialsCacheTags.list(workspaceOwnerId),
        categories: directoryMaterialsCacheTags.categories(workspaceOwnerId),
        detail: (materialId: string) =>
          directoryMaterialsCacheTags.detail(workspaceOwnerId, materialId),
        importJob: (jobId: string) =>
          directoryMaterialsCacheTags.importJob(workspaceOwnerId, jobId),
        aiSearchIndex: directoryMaterialsCacheTags.aiSearchIndex(workspaceOwnerId),
      },
    }
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      throw new DirectoryMaterialsApiError(
        "FORBIDDEN",
        "Нет доступа к workspace",
        403
      )
    }
    throw err
  }
}

export async function requireDirectoryMaterialsWriteContext(): Promise<DirectoryMaterialsContext> {
  const context = await requireDirectoryMaterialsReadContext()
  const role = await getWorkspaceRole(context.userId, context.workspaceOwnerId)

  if (!role || !WRITE_ROLES.has(role)) {
    throw new DirectoryMaterialsApiError(
      "FORBIDDEN",
      "Недостаточно прав для изменения справочника материалов",
      403
    )
  }

  return context
}

function revalidateDirectoryMaterialTags(
  context: DirectoryMaterialsContext,
  materialId?: string
) {
  revalidateTag(context.cacheTags.list, "max")
  revalidateTag(context.cacheTags.categories, "max")
  revalidateTag(context.cacheTags.aiSearchIndex, "max")
  if (materialId) revalidateTag(context.cacheTags.detail(materialId), "max")
}

function revalidateImportTags(context: DirectoryMaterialsContext, jobId: string) {
  revalidateTag(context.cacheTags.importJob(jobId), "max")
}

export async function listDirectoryMaterials(params: DirectoryMaterialsListParams) {
  const context = await requireDirectoryMaterialsReadContext()
  const normalizedParams = normalizeDirectoryMaterialsListParams(params)
  const cacheKey = stableHash({ workspaceOwnerId: context.workspaceOwnerId, normalizedParams })

  return unstable_cache(
    () => listDirectoryMaterialsForWorkspace(context.workspaceOwnerId, normalizedParams),
    ["directory-materials:list", cacheKey],
    {
      revalidate: LIST_CACHE_REVALIDATE_SECONDS,
      tags: [context.cacheTags.list],
    }
  )()
}

export async function getDirectoryMaterial(id: string) {
  const context = await requireDirectoryMaterialsReadContext()
  const material = await unstable_cache(
    () => getDirectoryMaterialForWorkspace(context.workspaceOwnerId, id),
    ["directory-materials:detail", context.workspaceOwnerId, id],
    {
      revalidate: DETAIL_CACHE_REVALIDATE_SECONDS,
      tags: [context.cacheTags.detail(id), context.cacheTags.list],
    }
  )()

  if (!material) {
    throw new DirectoryMaterialsApiError("NOT_FOUND", "Материал не найден", 404)
  }

  return {
    data: material,
    meta: {
      cacheTag: context.cacheTags.detail(material.id),
    },
  }
}

export async function createDirectoryMaterial(input: DirectoryMaterialMutationInput) {
  const context = await requireDirectoryMaterialsWriteContext()
  const material = await createDirectoryMaterialForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    input
  )

  await enqueueDirectoryMaterialEmbeddingForWorkspace(context.workspaceOwnerId, material.id)
  revalidateDirectoryMaterialTags(context, material.id)
  return { data: material }
}

export async function updateDirectoryMaterial(
  id: string,
  input: DirectoryMaterialMutationInput
) {
  const context = await requireDirectoryMaterialsWriteContext()
  const material = await updateDirectoryMaterialForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id,
    input
  )

  await enqueueDirectoryMaterialEmbeddingForWorkspace(context.workspaceOwnerId, material.id)
  revalidateDirectoryMaterialTags(context, material.id)
  return { data: material }
}

export async function archiveDirectoryMaterial(id: string) {
  const context = await requireDirectoryMaterialsWriteContext()
  const material = await archiveDirectoryMaterialForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id
  )

  revalidateDirectoryMaterialTags(context, material.id)
  return { data: material }
}

export async function getDirectoryMaterialsCategories(
  status: "active" | "archived"
) {
  const context = await requireDirectoryMaterialsReadContext()

  return unstable_cache(
    () => getDirectoryMaterialCategoriesForWorkspace(context.workspaceOwnerId, status),
    ["directory-materials:categories", context.workspaceOwnerId, status],
    {
      revalidate: CATEGORIES_CACHE_REVALIDATE_SECONDS,
      tags: [context.cacheTags.categories, context.cacheTags.list],
    }
  )()
}

export async function createDirectoryMaterialImportJob(
  input: DirectoryMaterialImportCreateInput
) {
  const context = await requireDirectoryMaterialsWriteContext()
  const response = await createDirectoryMaterialImportJobForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    input
  )

  revalidateImportTags(context, response.data.job.id)
  return response
}

export async function getDirectoryMaterialImportJob(id: string) {
  const context = await requireDirectoryMaterialsReadContext()
  const response = await getDirectoryMaterialImportJobForWorkspace(
    context.workspaceOwnerId,
    id
  )

  if (!response) {
    throw new DirectoryMaterialsApiError("NOT_FOUND", "Import job материалов не найден", 404)
  }

  return response
}

export async function applyDirectoryMaterialImportJob(id: string) {
  const context = await requireDirectoryMaterialsWriteContext()
  const response = await applyDirectoryMaterialImportJobForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id
  )

  if (response.data.appliedMaterialIds) {
    for (const materialId of response.data.appliedMaterialIds) {
      await enqueueDirectoryMaterialEmbeddingForWorkspace(context.workspaceOwnerId, materialId)
    }
  }

  revalidateDirectoryMaterialTags(context)
  revalidateImportTags(context, response.data.job.id)
  return response
}

export async function processDirectoryMaterialEmbeddings(input: { limit?: number }) {
  const context = await requireDirectoryMaterialsWriteContext()
  const response = await processDirectoryMaterialEmbeddingsForWorkspace(
    context.workspaceOwnerId,
    input.limit
  )

  revalidateTag(context.cacheTags.aiSearchIndex, "max")
  return response
}

export async function searchDirectoryMaterialsAi(input: {
  query: string
  category?: string | null
  subcategory?: string | null
  unit?: string | null
  limit?: number
  threshold?: number
}) {
  const context = await requireDirectoryMaterialsReadContext()

  return searchDirectoryMaterialsAiForWorkspace(context.workspaceOwnerId, input)
}

export async function exportDirectoryMaterials(
  format: DirectoryMaterialsExportFormat,
  params: DirectoryMaterialsListParams
) {
  const context = await requireDirectoryMaterialsReadContext()
  const normalizedParams = normalizeDirectoryMaterialsListParams({
    ...params,
    cursor: 0,
    limit: params.limit ?? 5000,
  })
  const response = await listDirectoryMaterialsForWorkspace(
    context.workspaceOwnerId,
    normalizedParams
  )

  return buildDirectoryMaterialsExportFile(response.data, format)
}
