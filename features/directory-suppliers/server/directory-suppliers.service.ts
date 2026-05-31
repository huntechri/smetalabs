import { createHash } from "node:crypto"
import { revalidateTag, unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceRole, requireCurrentWorkspace } from "@/lib/auth/team"
import { DirectorySuppliersApiError } from "../api/directory-suppliers-errors"
import { directorySuppliersCacheTags } from "../api/directory-suppliers-query-keys"
import type {
  DirectorySuppliersListParams,
  DirectorySupplierMutationInput,
} from "../model/directory-suppliers-model"
import {
  archiveDirectorySupplierForWorkspace,
  createDirectorySupplierForWorkspace,
  getDirectorySupplierForWorkspace,
  listDirectorySuppliersForWorkspace,
  updateDirectorySupplierForWorkspace,
} from "./directory-suppliers.repository"
import { normalizeDirectorySuppliersListParams } from "./directory-suppliers.schemas"

type DirectorySuppliersContext = {
  userId: string
  workspaceOwnerId: string
  cacheTags: {
    list: string
    detail: (supplierId: string) => string
  }
}

const WRITE_ROLES = new Set(["owner", "admin", "manager"])
const LIST_CACHE_REVALIDATE_SECONDS = 30
const DETAIL_CACHE_REVALIDATE_SECONDS = 120

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export async function requireDirectorySuppliersReadContext(): Promise<DirectorySuppliersContext> {
  const client = await createClient()
  const { data, error } = await client.auth.getUser()

  if (error || !data.user) {
    throw new DirectorySuppliersApiError(
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
        list: directorySuppliersCacheTags.list(workspaceOwnerId),
        detail: (supplierId: string) =>
          directorySuppliersCacheTags.detail(workspaceOwnerId, supplierId),
      },
    }
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      throw new DirectorySuppliersApiError(
        "FORBIDDEN",
        "Нет доступа к workspace",
        403
      )
    }
    throw err
  }
}

export async function requireDirectorySuppliersWriteContext(): Promise<DirectorySuppliersContext> {
  const context = await requireDirectorySuppliersReadContext()
  const role = await getWorkspaceRole(context.userId, context.workspaceOwnerId)

  if (!role || !WRITE_ROLES.has(role)) {
    throw new DirectorySuppliersApiError(
      "FORBIDDEN",
      "Недостаточно прав для изменения справочника поставщиков",
      403
    )
  }

  return context
}

function revalidateDirectorySupplierTags(
  context: DirectorySuppliersContext,
  supplierId?: string
) {
  revalidateTag(context.cacheTags.list, "max")
  if (supplierId) revalidateTag(context.cacheTags.detail(supplierId), "max")
}

export async function listDirectorySuppliers(
  params: DirectorySuppliersListParams
) {
  const context = await requireDirectorySuppliersReadContext()
  const normalizedParams = normalizeDirectorySuppliersListParams(params)
  const cacheKey = stableHash({
    workspaceOwnerId: context.workspaceOwnerId,
    normalizedParams,
  })

  return unstable_cache(
    () =>
      listDirectorySuppliersForWorkspace(
        context.workspaceOwnerId,
        normalizedParams
      ),
    ["directory-suppliers:list", cacheKey],
    {
      revalidate: LIST_CACHE_REVALIDATE_SECONDS,
      tags: [context.cacheTags.list],
    }
  )()
}

export async function getDirectorySupplier(id: string) {
  const context = await requireDirectorySuppliersReadContext()
  const supplier = await unstable_cache(
    () => getDirectorySupplierForWorkspace(context.workspaceOwnerId, id),
    ["directory-suppliers:detail", context.workspaceOwnerId, id],
    {
      revalidate: DETAIL_CACHE_REVALIDATE_SECONDS,
      tags: [context.cacheTags.detail(id), context.cacheTags.list],
    }
  )()

  if (!supplier)
    throw new DirectorySuppliersApiError(
      "NOT_FOUND",
      "Поставщик не найден",
      404
    )
  return {
    data: supplier,
    meta: { cacheTag: context.cacheTags.detail(supplier.id) },
  }
}

export async function createDirectorySupplier(
  input: DirectorySupplierMutationInput
) {
  const context = await requireDirectorySuppliersWriteContext()
  const supplier = await createDirectorySupplierForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    input
  )

  revalidateDirectorySupplierTags(context, supplier.id)
  return { data: supplier }
}

export async function updateDirectorySupplier(
  id: string,
  input: DirectorySupplierMutationInput
) {
  const context = await requireDirectorySuppliersWriteContext()
  const supplier = await updateDirectorySupplierForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id,
    input
  )

  revalidateDirectorySupplierTags(context, supplier.id)
  return { data: supplier }
}

export async function archiveDirectorySupplier(id: string) {
  const context = await requireDirectorySuppliersWriteContext()
  const supplier = await archiveDirectorySupplierForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id
  )

  revalidateDirectorySupplierTags(context, supplier.id)
  return { data: supplier }
}
