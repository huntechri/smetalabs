import { supabase } from "@/db"
import { DirectorySuppliersApiError } from "../api/directory-suppliers-errors"
import type {
  DirectorySupplier,
  DirectorySupplierMutationInput,
  DirectorySuppliersListParams,
  DirectorySuppliersListResponse,
} from "../types"

type NormalizedListParams = Required<
  Pick<DirectorySuppliersListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<DirectorySuppliersListParams, "status" | "limit" | "cursor" | "sort">

type DirectorySupplierDbRow = {
  id: string
  name: string
  normalized_name: string
  legal_status: "juridical" | "individual"
  color: string | null
  inn: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  status: "active" | "archived"
  version: number
  created_at: string
  updated_at: string
}

const SUPPLIER_SELECT =
  "id,name,normalized_name,legal_status,color,inn,phone,email,address,notes,status,version,created_at,updated_at"
const DEFAULT_COLOR = "#64748B"
const MAX_SEARCH_TOKENS = 8

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`)
}

function getSearchTokens(value: string) {
  const normalized = normalizeSearch(value)
  const tokens = normalized.match(/[\p{L}\p{N}@.+-]+/gu) ?? []

  return Array.from(new Set(tokens)).slice(0, MAX_SEARCH_TOKENS)
}

function toNullableString(value: string | null | undefined) {
  return value && value.trim() ? value.trim().replace(/\s+/g, " ") : null
}

function mapDirectorySupplierRow(
  row: DirectorySupplierDbRow
): DirectorySupplier {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    legalStatus: row.legal_status,
    color: row.color || DEFAULT_COLOR,
    inn: row.inn,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    status: row.status,
    version: row.version,
    metadata: {
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  }
}

function applyDirectorySupplierFilters<
  T extends { or: (filters: string) => T },
>(query: T, params: NormalizedListParams) {
  let scoped = query

  if (params.q) {
    const tokens = getSearchTokens(params.q)

    for (const token of tokens) {
      const q = escapeLike(token)
      scoped = scoped.or(
        [
          `normalized_name.ilike.%${q}%`,
          `inn.ilike.%${q}%`,
          `phone.ilike.%${q}%`,
          `email.ilike.%${q}%`,
        ].join(",")
      )
    }
  }

  return scoped
}

function applyDirectorySupplierSort<
  T extends { order: (column: string, options?: { ascending?: boolean }) => T },
>(query: T, params: NormalizedListParams) {
  if (params.sort === "name_asc") {
    return query
      .order("normalized_name", { ascending: true })
      .order("id", { ascending: true })
  }

  return query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
}

async function assertDirectorySupplierUniqueFields(
  workspaceOwnerId: string,
  input: DirectorySupplierMutationInput,
  currentSupplierId?: string
) {
  if (input.inn?.trim()) {
    let query = supabase
      .from("directory_suppliers")
      .select("id")
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("inn", input.inn.trim())
      .is("deleted_at", null)
      .limit(1)

    if (currentSupplierId) query = query.neq("id", currentSupplierId)

    const { data, error } = await query
    if (error) throw error
    if ((data ?? []).length > 0) {
      throw new DirectorySuppliersApiError(
        "BAD_REQUEST",
        "Поставщик с таким ИНН уже существует",
        400
      )
    }
  }
}

function toSupplierMutationRow(
  workspaceOwnerId: string,
  userId: string,
  input: DirectorySupplierMutationInput
) {
  return {
    workspace_owner_id: workspaceOwnerId,
    name: input.name.trim().replace(/\s+/g, " "),
    normalized_name: normalizeSearch(input.name),
    legal_status: input.legalStatus,
    color: input.color || DEFAULT_COLOR,
    inn: toNullableString(input.inn),
    phone: toNullableString(input.phone),
    email: toNullableString(input.email)?.toLowerCase() ?? null,
    address: toNullableString(input.address),
    notes: toNullableString(input.notes),
    updated_by: userId,
  }
}

export async function listDirectorySuppliersForWorkspace(
  workspaceOwnerId: string,
  params: NormalizedListParams
): Promise<DirectorySuppliersListResponse> {
  const from = params.cursor
  const to = params.cursor + params.limit

  let query = supabase
    .from("directory_suppliers")
    .select(SUPPLIER_SELECT, { count: "exact" })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", params.status)
    .is("deleted_at", null)

  query = applyDirectorySupplierFilters(query, params)
  query = applyDirectorySupplierSort(query, params)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  const rows = ((data ?? []) as DirectorySupplierDbRow[]).filter(Boolean)
  const visibleRows = rows.slice(0, params.limit)
  const hasMore = rows.length > params.limit

  return {
    data: visibleRows.map(mapDirectorySupplierRow),
    meta: {
      limit: params.limit,
      cursor: params.cursor,
      nextCursor: hasMore ? params.cursor + params.limit : null,
      hasMore,
      total: count ?? params.cursor + visibleRows.length + (hasMore ? 1 : 0),
    },
  }
}

export async function getDirectorySupplierForWorkspace(
  workspaceOwnerId: string,
  id: string
): Promise<DirectorySupplier | null> {
  const { data, error } = await supabase
    .from("directory_suppliers")
    .select(SUPPLIER_SELECT)
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }

  return mapDirectorySupplierRow(data as DirectorySupplierDbRow)
}

export async function createDirectorySupplierForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  input: DirectorySupplierMutationInput
): Promise<DirectorySupplier> {
  await assertDirectorySupplierUniqueFields(workspaceOwnerId, input)

  const { data, error } = await supabase
    .from("directory_suppliers")
    .insert({
      ...toSupplierMutationRow(workspaceOwnerId, userId, input),
      status: "active",
      version: 1,
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) throw error

  const supplier = await getDirectorySupplierForWorkspace(
    workspaceOwnerId,
    data.id
  )
  if (!supplier) {
    throw new DirectorySuppliersApiError(
      "INTERNAL_ERROR",
      "Созданный поставщик не найден",
      500
    )
  }

  return supplier
}

export async function updateDirectorySupplierForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string,
  input: DirectorySupplierMutationInput
): Promise<DirectorySupplier> {
  const existing = await getDirectorySupplierForWorkspace(workspaceOwnerId, id)
  if (!existing)
    throw new DirectorySuppliersApiError(
      "NOT_FOUND",
      "Поставщик не найден",
      404
    )

  await assertDirectorySupplierUniqueFields(workspaceOwnerId, input, id)

  const { error } = await supabase
    .from("directory_suppliers")
    .update({
      ...toSupplierMutationRow(workspaceOwnerId, userId, input),
      version: existing.version + 1,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("deleted_at", null)

  if (error) throw error

  const supplier = await getDirectorySupplierForWorkspace(workspaceOwnerId, id)
  if (!supplier) {
    throw new DirectorySuppliersApiError(
      "INTERNAL_ERROR",
      "Обновлённый поставщик не найден",
      500
    )
  }

  return supplier
}

export async function archiveDirectorySupplierForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string
): Promise<DirectorySupplier> {
  const existing = await getDirectorySupplierForWorkspace(workspaceOwnerId, id)
  if (!existing)
    throw new DirectorySuppliersApiError(
      "NOT_FOUND",
      "Поставщик не найден",
      404
    )

  const { error } = await supabase
    .from("directory_suppliers")
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

  const supplier = await getDirectorySupplierForWorkspace(workspaceOwnerId, id)
  if (!supplier) {
    throw new DirectorySuppliersApiError(
      "INTERNAL_ERROR",
      "Архивированный поставщик не найден",
      500
    )
  }

  return supplier
}
