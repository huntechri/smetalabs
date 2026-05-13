import { supabase } from "@/db"
import type {
  DirectoryWork,
  DirectoryWorksCategoriesResponse,
  DirectoryWorksListMeta,
  DirectoryWorksListParams,
  DirectoryWorksListResponse,
} from "../types"
import {
  getTotalCount,
  mapDirectoryWorkCategories,
  mapDirectoryWorkRow,
  type DirectoryWorkCategoryRpcRow,
  type DirectoryWorkRpcRow,
} from "../api/directory-works-mappers"

type NormalizedListParams = Required<
  Pick<DirectoryWorksListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<DirectoryWorksListParams, "status" | "limit" | "cursor" | "sort">

export async function listDirectoryWorksForWorkspace(
  workspaceOwnerId: string,
  params: NormalizedListParams
): Promise<DirectoryWorksListResponse> {
  const { data, error } = await supabase.rpc("search_directory_works", {
    p_workspace_owner_id: workspaceOwnerId,
    p_q: params.q ?? null,
    p_category: params.category ?? null,
    p_subcategory: params.subcategory ?? null,
    p_unit: params.unit ?? null,
    p_status: params.status,
    p_limit: params.limit,
    p_cursor: params.cursor,
    p_sort: params.sort,
  })

  if (error) throw error

  const rows = ((data ?? []) as DirectoryWorkRpcRow[]).filter(Boolean)
  const visibleRows = rows.slice(0, params.limit)
  const hasMore = rows.length > params.limit
  const total = getTotalCount(rows)

  const meta: DirectoryWorksListMeta = {
    limit: params.limit,
    cursor: params.cursor,
    nextCursor: hasMore ? params.cursor + params.limit : null,
    hasMore,
    total,
  }

  return {
    data: visibleRows.map(mapDirectoryWorkRow),
    meta,
  }
}

export async function getDirectoryWorkForWorkspace(
  workspaceOwnerId: string,
  id: string
): Promise<DirectoryWork | null> {
  const { data, error } = await supabase.rpc("get_directory_work_detail", {
    p_workspace_owner_id: workspaceOwnerId,
    p_id: id,
  })

  if (error) throw error

  const row = ((data ?? []) as DirectoryWorkRpcRow[])[0]
  return row ? mapDirectoryWorkRow(row) : null
}

export async function getDirectoryWorkCategoriesForWorkspace(
  workspaceOwnerId: string,
  status: "active" | "archived" = "active"
): Promise<DirectoryWorksCategoriesResponse> {
  const { data, error } = await supabase.rpc("get_directory_work_categories", {
    p_workspace_owner_id: workspaceOwnerId,
    p_status: status,
  })

  if (error) throw error

  const mapped = mapDirectoryWorkCategories(
    (data ?? []) as DirectoryWorkCategoryRpcRow[]
  )

  return {
    data: mapped,
    meta: {
      totalCategories: mapped.categories.length,
      totalUnits: mapped.units.length,
    },
  }
}
