import { createClient } from "@/lib/supabase/server"
import { requireCurrentWorkspace } from "@/lib/auth/team"
import { DirectoryWorksApiError } from "../api/directory-works-errors"
import type { DirectoryWorksListParams } from "../types"
import { directoryWorksCacheTags } from "../api/directory-works-query-keys"
import {
  getDirectoryWorkCategoriesForWorkspace,
  getDirectoryWorkForWorkspace,
  listDirectoryWorksForWorkspace,
} from "./directory-works.repository"
import { normalizeDirectoryWorksListParams } from "./directory-works.search"

type DirectoryWorksReadContext = {
  userId: string
  workspaceOwnerId: string
  cacheTags: {
    list: string
    categories: string
    detail: (workId: string) => string
  }
}

export async function requireDirectoryWorksReadContext(): Promise<DirectoryWorksReadContext> {
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

export async function getDirectoryWorksCategories(status: "active" | "archived") {
  const context = await requireDirectoryWorksReadContext()
  return getDirectoryWorkCategoriesForWorkspace(context.workspaceOwnerId, status)
}
