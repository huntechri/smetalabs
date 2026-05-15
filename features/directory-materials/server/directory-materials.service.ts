import { createHash } from "node:crypto"
import { unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentWorkspace } from "@/lib/auth/team"
import { DirectoryMaterialsApiError } from "../api/directory-materials-errors"
import { directoryMaterialsCacheTags } from "../api/directory-materials-query-keys"
import type { DirectoryMaterialsListParams } from "../types"
import {
  getDirectoryMaterialCategoriesForWorkspace,
  getDirectoryMaterialForWorkspace,
  listDirectoryMaterialsForWorkspace,
} from "./directory-materials.repository"
import { normalizeDirectoryMaterialsListParams } from "./directory-materials.schemas"

type DirectoryMaterialsContext = {
  userId: string
  workspaceOwnerId: string
  cacheTags: {
    list: string
    categories: string
    detail: (materialId: string) => string
    aiSearchIndex: string
  }
}

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
