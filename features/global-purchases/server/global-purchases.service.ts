import { createHash } from "node:crypto"
import { revalidateTag, unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceRole, requireCurrentWorkspace } from "@/lib/auth/team"
import { GlobalPurchasesApiError } from "../api/global-purchases-errors"
import { globalPurchasesCacheTags } from "../api/global-purchases-query-keys"
import type { GlobalPurchaseMutationInput, GlobalPurchasesListParams } from "@/types/global-purchases"
import {
  archiveGlobalPurchaseForWorkspace,
  createGlobalPurchaseForWorkspace,
  getGlobalPurchaseForWorkspace,
  listGlobalPurchasesForWorkspace,
  searchGlobalPurchaseMaterialOptionsForWorkspace,
  updateGlobalPurchaseForWorkspace,
} from "./global-purchases.repository"
import { normalizeGlobalPurchasesListParams } from "./global-purchases.schemas"

type GlobalPurchasesContext = {
  userId: string
  workspaceOwnerId: string
  cacheTags: {
    list: string
    detail: (purchaseId: string) => string
  }
}

const WRITE_ROLES = new Set(["owner", "admin", "manager"])
const LIST_CACHE_REVALIDATE_SECONDS = 30
const DETAIL_CACHE_REVALIDATE_SECONDS = 120

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export async function requireGlobalPurchasesReadContext(): Promise<GlobalPurchasesContext> {
  const client = await createClient()
  const { data, error } = await client.auth.getUser()

  if (error || !data.user) {
    throw new GlobalPurchasesApiError("UNAUTHORIZED", "Требуется аутентификация", 401)
  }

  try {
    const workspaceOwnerId = await requireCurrentWorkspace(data.user.id)
    return {
      userId: data.user.id,
      workspaceOwnerId,
      cacheTags: {
        list: globalPurchasesCacheTags.list(workspaceOwnerId),
        detail: (purchaseId: string) => globalPurchasesCacheTags.detail(workspaceOwnerId, purchaseId),
      },
    }
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      throw new GlobalPurchasesApiError("FORBIDDEN", "Нет доступа к workspace", 403)
    }
    throw err
  }
}

export async function requireGlobalPurchasesWriteContext(): Promise<GlobalPurchasesContext> {
  const context = await requireGlobalPurchasesReadContext()
  const role = await getWorkspaceRole(context.userId, context.workspaceOwnerId)

  if (!role || !WRITE_ROLES.has(role)) {
    throw new GlobalPurchasesApiError("FORBIDDEN", "Недостаточно прав для изменения закупок", 403)
  }

  return context
}

function revalidateGlobalPurchaseTags(context: GlobalPurchasesContext, purchaseId?: string) {
  revalidateTag(context.cacheTags.list, "max")
  if (purchaseId) revalidateTag(context.cacheTags.detail(purchaseId), "max")
}

export async function listGlobalPurchases(params: GlobalPurchasesListParams) {
  const context = await requireGlobalPurchasesReadContext()
  const normalizedParams = normalizeGlobalPurchasesListParams(params)
  const cacheKey = stableHash({ workspaceOwnerId: context.workspaceOwnerId, normalizedParams })

  return unstable_cache(
    () => listGlobalPurchasesForWorkspace(context.workspaceOwnerId, normalizedParams),
    ["global-purchases:list", cacheKey],
    { revalidate: LIST_CACHE_REVALIDATE_SECONDS, tags: [context.cacheTags.list] }
  )()
}

export async function searchGlobalPurchaseMaterialOptions(query: string) {
  const context = await requireGlobalPurchasesReadContext()
  const normalizedQuery = query.trim().replace(/\s+/g, " ")
  if (normalizedQuery.length < 2) return { data: [] }

  const cacheKey = stableHash({ workspaceOwnerId: context.workspaceOwnerId, normalizedQuery })
  const data = await unstable_cache(
    () => searchGlobalPurchaseMaterialOptionsForWorkspace(context.workspaceOwnerId, normalizedQuery),
    ["global-purchases:material-options", cacheKey],
    { revalidate: LIST_CACHE_REVALIDATE_SECONDS, tags: [context.cacheTags.list] }
  )()

  return { data }
}

export async function getGlobalPurchase(id: string) {
  const context = await requireGlobalPurchasesReadContext()
  const purchase = await unstable_cache(
    () => getGlobalPurchaseForWorkspace(context.workspaceOwnerId, id),
    ["global-purchases:detail", context.workspaceOwnerId, id],
    {
      revalidate: DETAIL_CACHE_REVALIDATE_SECONDS,
      tags: [context.cacheTags.detail(id), context.cacheTags.list],
    }
  )()

  if (!purchase) throw new GlobalPurchasesApiError("NOT_FOUND", "Закупка не найдена", 404)
  return { data: purchase, meta: { cacheTag: context.cacheTags.detail(purchase.id) } }
}

export async function createGlobalPurchase(input: GlobalPurchaseMutationInput) {
  const context = await requireGlobalPurchasesWriteContext()
  const purchase = await createGlobalPurchaseForWorkspace(context.workspaceOwnerId, context.userId, input)

  revalidateGlobalPurchaseTags(context, purchase.id)
  return { data: purchase }
}

export async function updateGlobalPurchase(id: string, input: GlobalPurchaseMutationInput) {
  const context = await requireGlobalPurchasesWriteContext()
  const purchase = await updateGlobalPurchaseForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id,
    input
  )

  revalidateGlobalPurchaseTags(context, purchase.id)
  return { data: purchase }
}

export async function archiveGlobalPurchase(id: string) {
  const context = await requireGlobalPurchasesWriteContext()
  const purchase = await archiveGlobalPurchaseForWorkspace(context.workspaceOwnerId, context.userId, id)

  revalidateGlobalPurchaseTags(context, purchase.id)
  return { data: purchase }
}
