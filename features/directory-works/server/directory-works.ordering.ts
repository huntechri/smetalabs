import { supabase } from "@/db"
import { DirectoryWorksApiError } from "../api/directory-works-errors"

const ORDER_STEP = 1000
const MIN_ORDER_GAP = 0.0001

type DirectoryWorkOrderRow = {
  id: string
  sort_order: number | string | null
}

function toOrderNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function normalizeDirectoryWorkSortOrders(workspaceOwnerId: string) {
  const { data, error } = await supabase
    .from("directory_works")
    .select("id, sort_order")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })

  if (error) throw error

  const rows = ((data ?? []) as DirectoryWorkOrderRow[]).filter(Boolean)

  await Promise.all(
    rows.map((row, index) =>
      supabase
        .from("directory_works")
        .update({ sort_order: (index + 1) * ORDER_STEP })
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("id", row.id)
    )
  )
}

async function getFirstSortOrder(workspaceOwnerId: string) {
  const { data, error } = await supabase
    .from("directory_works")
    .select("sort_order")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? toOrderNumber((data as DirectoryWorkOrderRow).sort_order) : null
}

async function getWorkOrder(workspaceOwnerId: string, workId: string) {
  const { data, error } = await supabase
    .from("directory_works")
    .select("id, sort_order")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", workId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  return data ? (data as DirectoryWorkOrderRow) : null
}

async function getNextSortOrder(workspaceOwnerId: string, afterSortOrder: number) {
  const { data, error } = await supabase
    .from("directory_works")
    .select("sort_order")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", "active")
    .is("deleted_at", null)
    .gt("sort_order", afterSortOrder)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? toOrderNumber((data as DirectoryWorkOrderRow).sort_order) : null
}

export async function getSortOrderForNewDirectoryWork(
  workspaceOwnerId: string,
  insertAfterWorkId?: string | null,
  retried = false
): Promise<number> {
  if (!insertAfterWorkId) {
    const firstSortOrder = await getFirstSortOrder(workspaceOwnerId)
    return firstSortOrder === null ? ORDER_STEP : firstSortOrder - ORDER_STEP
  }

  const afterWork = await getWorkOrder(workspaceOwnerId, insertAfterWorkId)
  if (!afterWork) {
    throw new DirectoryWorksApiError(
      "BAD_REQUEST",
      "Работа для вставки не найдена",
      400
    )
  }

  const afterSortOrder = toOrderNumber(afterWork.sort_order)
  const nextSortOrder = await getNextSortOrder(workspaceOwnerId, afterSortOrder)

  if (nextSortOrder === null) return afterSortOrder + ORDER_STEP

  const gap = nextSortOrder - afterSortOrder
  if (gap > MIN_ORDER_GAP) return afterSortOrder + gap / 2

  if (retried) return afterSortOrder + MIN_ORDER_GAP / 2

  await normalizeDirectoryWorkSortOrders(workspaceOwnerId)
  return getSortOrderForNewDirectoryWork(workspaceOwnerId, insertAfterWorkId, true)
}

export async function getSortOrderStartForImportedDirectoryWorks(
  workspaceOwnerId: string,
  rowCount: number
) {
  const firstSortOrder = await getFirstSortOrder(workspaceOwnerId)
  if (firstSortOrder === null) return ORDER_STEP

  return firstSortOrder - Math.max(rowCount, 1) * ORDER_STEP
}

export function getImportedDirectoryWorkSortOrder(startSortOrder: number, index: number) {
  return startSortOrder + index * ORDER_STEP
}
