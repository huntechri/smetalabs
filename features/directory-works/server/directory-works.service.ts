import { revalidateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceRole, requireCurrentWorkspace } from "@/lib/auth/team"
import { DirectoryWorksApiError } from "../api/directory-works-errors"
import type {
  DirectoryWorkMutationInput,
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
import { normalizeDirectoryWorksListParams } from "./directory-works.search"

type DirectoryWorksContext = {
  userId: string
  workspaceOwnerId: string
  cacheTags: {
    list: string
    categories: string
    detail: (workId: string) => string
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
