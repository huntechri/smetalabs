import { supabase } from "@/db"
import type {
  DirectoryWork,
  DirectoryWorkMutationInput,
  DirectoryWorkPriceKind,
  DirectoryWorksCategoriesResponse,
  DirectoryWorksListMeta,
  DirectoryWorksListParams,
  DirectoryWorksListResponse,
} from "../types"
import { DirectoryWorksApiError } from "../api/directory-works-errors"
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

type DirectoryWorkMutationRow = {
  workspace_owner_id: string
  title: string
  unit_code: string
  unit_label: string
  rate_amount: number
  category: string
  subcategory: string | null
  code: string | null
  description: string | null
  included_operations: string | null
  excluded_operations: string | null
  source_name: string | null
  source_external_row_key: string | null
  currency_code: string
  price_kind: DirectoryWorkPriceKind
  updated_by: string
}

function normalizeUnitCode(unit: string) {
  return unit.trim().toLowerCase().replace(/\s+/g, "_")
}

function toNullableString(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : null
}

function toMutationRow(
  workspaceOwnerId: string,
  userId: string,
  input: DirectoryWorkMutationInput
): DirectoryWorkMutationRow {
  const unit = input.unit.trim().replace(/\s+/g, " ")

  return {
    workspace_owner_id: workspaceOwnerId,
    title: input.title.trim().replace(/\s+/g, " "),
    unit_code: normalizeUnitCode(unit),
    unit_label: unit,
    rate_amount: input.rate,
    category: input.category.trim().replace(/\s+/g, " "),
    subcategory: toNullableString(input.subcategory),
    code: toNullableString(input.code),
    description: toNullableString(input.description),
    included_operations: toNullableString(input.includedOperations),
    excluded_operations: toNullableString(input.excludedOperations),
    source_name: toNullableString(input.sourceName),
    source_external_row_key: toNullableString(input.sourceExternalRowKey),
    currency_code: input.currencyCode ?? "RUB",
    price_kind: input.priceKind ?? "base",
    updated_by: userId,
  }
}

function mapDirectoryWorkMutationError(error: { code?: string; message?: string }) {
  if (error.code === "23505" && error.message?.includes("DIRECTORY_WORK_CODE_DUPLICATE")) {
    return new DirectoryWorksApiError(
      "BAD_REQUEST",
      "Работа с таким кодом уже существует",
      400
    )
  }

  if (error.code === "23505" && error.message?.includes("DIRECTORY_WORK_SOURCE_DUPLICATE")) {
    return new DirectoryWorksApiError(
      "BAD_REQUEST",
      "Работа с таким внешним идентификатором уже существует",
      400
    )
  }

  return error
}

async function assertDirectoryWorkUniqueFields(
  workspaceOwnerId: string,
  input: DirectoryWorkMutationInput,
  currentWorkId?: string
) {
  if (input.code?.trim()) {
    let codeQuery = supabase
      .from("directory_works")
      .select("id")
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("code", input.code.trim())
      .is("deleted_at", null)
      .limit(1)

    if (currentWorkId) codeQuery = codeQuery.neq("id", currentWorkId)

    const { data, error } = await codeQuery
    if (error) throw error
    if ((data ?? []).length > 0) {
      throw new DirectoryWorksApiError(
        "BAD_REQUEST",
        "Работа с таким кодом уже существует",
        400
      )
    }
  }

  if (input.sourceName?.trim() && input.sourceExternalRowKey?.trim()) {
    let sourceQuery = supabase
      .from("directory_works")
      .select("id")
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("source_name", input.sourceName.trim())
      .eq("source_external_row_key", input.sourceExternalRowKey.trim())
      .is("deleted_at", null)
      .limit(1)

    if (currentWorkId) sourceQuery = sourceQuery.neq("id", currentWorkId)

    const { data, error } = await sourceQuery
    if (error) throw error
    if ((data ?? []).length > 0) {
      throw new DirectoryWorksApiError(
        "BAD_REQUEST",
        "Работа с таким внешним идентификатором уже существует",
        400
      )
    }
  }
}

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
  const total = getTotalCount(rows, params.cursor, visibleRows.length, hasMore)

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

export async function createDirectoryWorkForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  input: DirectoryWorkMutationInput
): Promise<DirectoryWork> {
  await assertDirectoryWorkUniqueFields(workspaceOwnerId, input)

  const { data, error } = await supabase
    .from("directory_works")
    .insert({
      ...toMutationRow(workspaceOwnerId, userId, input),
      created_by: userId,
      status: "active",
    })
    .select("id")
    .single()

  if (error) throw error

  const work = await getDirectoryWorkForWorkspace(workspaceOwnerId, data.id)
  if (!work) {
    throw new DirectoryWorksApiError(
      "INTERNAL_ERROR",
      "Созданная работа не найдена",
      500
    )
  }

  return work
}

export async function updateDirectoryWorkForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string,
  input: DirectoryWorkMutationInput
): Promise<DirectoryWork> {
  const { data, error } = await supabase.rpc("update_directory_work_with_embedding", {
    p_workspace_owner_id: workspaceOwnerId,
    p_user_id: userId,
    p_id: id,
    p_title: input.title,
    p_unit: input.unit,
    p_rate: input.rate,
    p_category: input.category,
    p_subcategory: input.subcategory ?? null,
    p_code: input.code ?? null,
    p_description: input.description ?? null,
    p_included_operations: input.includedOperations ?? null,
    p_excluded_operations: input.excludedOperations ?? null,
    p_source_name: input.sourceName ?? null,
    p_source_external_row_key: input.sourceExternalRowKey ?? null,
    p_currency_code: input.currencyCode ?? "RUB",
    p_price_kind: input.priceKind ?? "base",
    p_enqueue_embedding: true,
  })

  if (error) throw mapDirectoryWorkMutationError(error)

  const row = ((data ?? []) as DirectoryWorkRpcRow[])[0]
  if (!row) {
    throw new DirectoryWorksApiError("NOT_FOUND", "Работа не найдена", 404)
  }

  return mapDirectoryWorkRow(row)
}

export async function archiveDirectoryWorkForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string
): Promise<DirectoryWork> {
  const existing = await getDirectoryWorkForWorkspace(workspaceOwnerId, id)
  if (!existing) {
    throw new DirectoryWorksApiError("NOT_FOUND", "Работа не найдена", 404)
  }

  const { error } = await supabase
    .from("directory_works")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      updated_by: userId,
      version: existing.version + 1,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("deleted_at", null)

  if (error) throw error

  const work = await getDirectoryWorkForWorkspace(workspaceOwnerId, id)
  if (!work) {
    throw new DirectoryWorksApiError(
      "INTERNAL_ERROR",
      "Архивированная работа не найдена",
      500
    )
  }

  return work
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
