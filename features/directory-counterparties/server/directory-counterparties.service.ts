import { createHash } from "node:crypto"
import { revalidateTag, unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceRole, requireCurrentWorkspace } from "@/lib/auth/team"
import { DirectoryCounterpartiesApiError } from "../api/directory-counterparties-errors"
import { directoryCounterpartiesCacheTags } from "../api/directory-counterparties-query-keys"
import type {
  DirectoryCounterpartiesListParams,
  DirectoryCounterpartyMutationInput,
} from "../types"
import {
  archiveDirectoryCounterpartyForWorkspace,
  createDirectoryCounterpartyForWorkspace,
  getDirectoryCounterpartyForWorkspace,
  listDirectoryCounterpartiesForWorkspace,
  updateDirectoryCounterpartyForWorkspace,
} from "./directory-counterparties.repository"
import { normalizeDirectoryCounterpartiesListParams } from "./directory-counterparties.schemas"

type DirectoryCounterpartiesContext = {
  userId: string
  workspaceOwnerId: string
  cacheTags: {
    list: string
    detail: (counterpartyId: string) => string
  }
}

const WRITE_ROLES = new Set(["owner", "admin", "manager"])
const LIST_CACHE_REVALIDATE_SECONDS = 30
const DETAIL_CACHE_REVALIDATE_SECONDS = 120

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export async function requireDirectoryCounterpartiesReadContext(): Promise<DirectoryCounterpartiesContext> {
  const client = await createClient()
  const { data, error } = await client.auth.getUser()

  if (error || !data.user) {
    throw new DirectoryCounterpartiesApiError("UNAUTHORIZED", "Требуется аутентификация", 401)
  }

  try {
    const workspaceOwnerId = await requireCurrentWorkspace(data.user.id)
    return {
      userId: data.user.id,
      workspaceOwnerId,
      cacheTags: {
        list: directoryCounterpartiesCacheTags.list(workspaceOwnerId),
        detail: (counterpartyId: string) =>
          directoryCounterpartiesCacheTags.detail(workspaceOwnerId, counterpartyId),
      },
    }
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      throw new DirectoryCounterpartiesApiError("FORBIDDEN", "Нет доступа к workspace", 403)
    }
    throw err
  }
}

export async function requireDirectoryCounterpartiesWriteContext(): Promise<DirectoryCounterpartiesContext> {
  const context = await requireDirectoryCounterpartiesReadContext()
  const role = await getWorkspaceRole(context.userId, context.workspaceOwnerId)

  if (!role || !WRITE_ROLES.has(role)) {
    throw new DirectoryCounterpartiesApiError("FORBIDDEN", "Недостаточно прав для изменения справочника контрагентов", 403)
  }

  return context
}

function revalidateDirectoryCounterpartyTags(
  context: DirectoryCounterpartiesContext,
  counterpartyId?: string
) {
  revalidateTag(context.cacheTags.list, "max")
  if (counterpartyId) revalidateTag(context.cacheTags.detail(counterpartyId), "max")
}

export async function listDirectoryCounterparties(params: DirectoryCounterpartiesListParams) {
  const context = await requireDirectoryCounterpartiesReadContext()
  const normalizedParams = normalizeDirectoryCounterpartiesListParams(params)
  const cacheKey = stableHash({ workspaceOwnerId: context.workspaceOwnerId, normalizedParams })

  return unstable_cache(
    () => listDirectoryCounterpartiesForWorkspace(context.workspaceOwnerId, normalizedParams),
    ["directory-counterparties:list", cacheKey],
    { revalidate: LIST_CACHE_REVALIDATE_SECONDS, tags: [context.cacheTags.list] }
  )()
}

export async function getDirectoryCounterparty(id: string) {
  const context = await requireDirectoryCounterpartiesReadContext()
  const counterparty = await unstable_cache(
    () => getDirectoryCounterpartyForWorkspace(context.workspaceOwnerId, id),
    ["directory-counterparties:detail", context.workspaceOwnerId, id],
    {
      revalidate: DETAIL_CACHE_REVALIDATE_SECONDS,
      tags: [context.cacheTags.detail(id), context.cacheTags.list],
    }
  )()

  if (!counterparty) throw new DirectoryCounterpartiesApiError("NOT_FOUND", "Контрагент не найден", 404)
  return { data: counterparty, meta: { cacheTag: context.cacheTags.detail(counterparty.id) } }
}

export async function createDirectoryCounterparty(input: DirectoryCounterpartyMutationInput) {
  const context = await requireDirectoryCounterpartiesWriteContext()
  const counterparty = await createDirectoryCounterpartyForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    input
  )

  revalidateDirectoryCounterpartyTags(context, counterparty.id)
  return { data: counterparty }
}

export async function updateDirectoryCounterparty(
  id: string,
  input: DirectoryCounterpartyMutationInput
) {
  const context = await requireDirectoryCounterpartiesWriteContext()
  const counterparty = await updateDirectoryCounterpartyForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id,
    input
  )

  revalidateDirectoryCounterpartyTags(context, counterparty.id)
  return { data: counterparty }
}

export async function archiveDirectoryCounterparty(id: string) {
  const context = await requireDirectoryCounterpartiesWriteContext()
  const counterparty = await archiveDirectoryCounterpartyForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id
  )

  revalidateDirectoryCounterpartyTags(context, counterparty.id)
  return { data: counterparty }
}
