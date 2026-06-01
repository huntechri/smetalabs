import { supabase } from "@/db"
import { DirectoryMaterialsApiError } from "../api/directory-materials-errors"
import type {
  DirectoryMaterial,
  DirectoryMaterialCategoryOption,
  DirectoryMaterialMutationInput,
  DirectoryMaterialSupplierOption,
  DirectoryMaterialsCategoriesParams,
  DirectoryMaterialsCategoriesResponse,
  DirectoryMaterialsListParams,
  DirectoryMaterialsListResponse,
  DirectoryMaterialUnitOption,
} from "../model/directory-materials-model"

type NormalizedListParams = Required<
  Pick<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort">

type NormalizedCategoriesParams = Required<
  Pick<DirectoryMaterialsCategoriesParams, "status">
> &
  Omit<DirectoryMaterialsCategoriesParams, "status">

type DirectoryMaterialDbRow = {
  id: string
  name: string
  unit_code: string
  unit_label: string
  price_amount: string | number
  currency_code: string
  category: string
  subcategory: string | null
  code: string | null
  supplier_name: string | null
  supplier_id: string | null
  image_url: string | null
  description: string | null
  aliases: string[] | null
  keywords: string[] | null
  source_name: string | null
  source_external_row_key: string | null
  status: "active" | "archived"
  version: number
  created_at: string
  updated_at: string
}

const MATERIAL_SELECT =
  "id,name,unit_code,unit_label,price_amount,currency_code,category,subcategory,code,supplier_name,supplier_id,image_url,description,aliases,keywords,source_name,source_external_row_key,status,version,created_at,updated_at"
const MAX_SEARCH_TOKENS = 8

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeUnitCode(unit: string) {
  return normalizeSearch(unit).replace(/\s+/g, "_")
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`)
}

function getSearchTokens(value: string) {
  const normalized = normalizeSearch(value)
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) ?? []

  return Array.from(new Set(tokens)).slice(0, MAX_SEARCH_TOKENS)
}

function toNullableString(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : null
}

function normalizeList(value: string[] | undefined) {
  return Array.from(
    new Set(
      (value ?? [])
        .map((item) => item.trim().replace(/\s+/g, " "))
        .filter(Boolean)
    )
  )
}

function toNumber(value: string | number) {
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapDirectoryMaterialRow(
  row: DirectoryMaterialDbRow
): DirectoryMaterial {
  const priceAmount = toNumber(row.price_amount)

  return {
    id: row.id,
    name: row.name,
    unit: row.unit_label || row.unit_code,
    unitCode: row.unit_code,
    unitLabel: row.unit_label,
    price: priceAmount,
    priceAmount,
    currencyCode: row.currency_code,
    category: row.category,
    subcategory: row.subcategory,
    code: row.code,
    supplierName: row.supplier_name,
    supplierId: row.supplier_id,
    imageUrl: row.image_url,
    description: row.description,
    aliases: row.aliases ?? [],
    keywords: row.keywords ?? [],
    status: row.status,
    version: row.version,
    metadata: {
      sourceName: row.source_name,
      sourceExternalRowKey: row.source_external_row_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      searchRank: null,
    },
  }
}

function applyDirectoryMaterialFilters<
  T extends {
    or: (filters: string) => T
    eq: (column: string, value: string) => T
  },
>(query: T, params: NormalizedListParams) {
  let scoped = query

  if (params.category) scoped = scoped.eq("category", params.category)
  if (params.subcategory) scoped = scoped.eq("subcategory", params.subcategory)
  if (params.unit) scoped = scoped.eq("unit_code", normalizeSearch(params.unit))
  if (params.supplier) scoped = scoped.eq("supplier_name", params.supplier)

  if (params.q) {
    const tokens = getSearchTokens(params.q)

    for (const token of tokens) {
      const q = escapeLike(token)
      scoped = scoped.or(
        [
          `normalized_name.ilike.%${q}%`,
          `search_text.ilike.%${q}%`,
          `code.ilike.%${q}%`,
          `supplier_name.ilike.%${q}%`,
          `source_external_row_key.ilike.%${q}%`,
        ].join(",")
      )
    }
  }

  return scoped
}

function applyDirectoryMaterialSort<
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

async function assertDirectoryMaterialUniqueFields(
  workspaceOwnerId: string,
  input: DirectoryMaterialMutationInput,
  currentMaterialId?: string
) {
  if (input.code?.trim()) {
    let query = supabase
      .from("directory_materials")
      .select("id")
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("code", input.code.trim())
      .is("deleted_at", null)
      .limit(1)

    if (currentMaterialId) query = query.neq("id", currentMaterialId)

    const { data, error } = await query
    if (error) throw error
    if ((data ?? []).length > 0) {
      throw new DirectoryMaterialsApiError(
        "BAD_REQUEST",
        "Материал с таким кодом уже существует",
        400
      )
    }
  }

  if (input.sourceName?.trim() && input.sourceExternalRowKey?.trim()) {
    let query = supabase
      .from("directory_materials")
      .select("id")
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("source_name", input.sourceName.trim())
      .eq("source_external_row_key", input.sourceExternalRowKey.trim())
      .is("deleted_at", null)
      .limit(1)

    if (currentMaterialId) query = query.neq("id", currentMaterialId)

    const { data, error } = await query
    if (error) throw error
    if ((data ?? []).length > 0) {
      throw new DirectoryMaterialsApiError(
        "BAD_REQUEST",
        "Материал с таким внешним идентификатором уже существует",
        400
      )
    }
  }
}

function toMaterialMutationRow(
  workspaceOwnerId: string,
  userId: string,
  input: DirectoryMaterialMutationInput
) {
  const unit = input.unit.trim().replace(/\s+/g, " ")

  return {
    workspace_owner_id: workspaceOwnerId,
    name: input.name.trim().replace(/\s+/g, " "),
    normalized_name: "pending",
    unit_code: normalizeUnitCode(unit),
    unit_label: unit,
    price_amount: input.price,
    currency_code: input.currencyCode ?? "RUB",
    category: input.category.trim().replace(/\s+/g, " "),
    subcategory: toNullableString(input.subcategory),
    code: toNullableString(input.code),
    supplier_name: toNullableString(input.supplierName),
    supplier_id: null,
    image_url: toNullableString(input.imageUrl),
    description: toNullableString(input.description),
    aliases: normalizeList(input.aliases),
    keywords: normalizeList(input.keywords),
    source_name: toNullableString(input.sourceName),
    source_external_row_key: toNullableString(input.sourceExternalRowKey),
    dedupe_fingerprint: "pending",
    search_text: "pending",
    search_fts: "",
    updated_by: userId,
  }
}

export async function listDirectoryMaterialsForWorkspace(
  workspaceOwnerId: string,
  params: NormalizedListParams
): Promise<DirectoryMaterialsListResponse> {
  const from = params.cursor
  const to = params.cursor + params.limit

  let query = supabase
    .from("directory_materials")
    .select(MATERIAL_SELECT, { count: "exact" })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", params.status)
    .is("deleted_at", null)

  query = applyDirectoryMaterialFilters(query, params)
  query = applyDirectoryMaterialSort(query, params)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  const rows = ((data ?? []) as DirectoryMaterialDbRow[]).filter(Boolean)
  const visibleRows = rows.slice(0, params.limit)
  const hasMore = rows.length > params.limit

  return {
    data: visibleRows.map(mapDirectoryMaterialRow),
    meta: {
      limit: params.limit,
      cursor: params.cursor,
      nextCursor: hasMore ? params.cursor + params.limit : null,
      hasMore,
      total: count ?? params.cursor + visibleRows.length + (hasMore ? 1 : 0),
    },
  }
}

export async function getDirectoryMaterialForWorkspace(
  workspaceOwnerId: string,
  id: string
): Promise<DirectoryMaterial | null> {
  const { data, error } = await supabase
    .from("directory_materials")
    .select(MATERIAL_SELECT)
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }

  return mapDirectoryMaterialRow(data as DirectoryMaterialDbRow)
}

export async function createDirectoryMaterialForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  input: DirectoryMaterialMutationInput
): Promise<DirectoryMaterial> {
  await assertDirectoryMaterialUniqueFields(workspaceOwnerId, input)

  const { data, error } = await supabase
    .from("directory_materials")
    .insert({
      ...toMaterialMutationRow(workspaceOwnerId, userId, input),
      status: "active",
      version: 1,
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) throw error

  const material = await getDirectoryMaterialForWorkspace(
    workspaceOwnerId,
    data.id
  )
  if (!material) {
    throw new DirectoryMaterialsApiError(
      "INTERNAL_ERROR",
      "Созданный материал не найден",
      500
    )
  }

  return material
}

export async function updateDirectoryMaterialForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string,
  input: DirectoryMaterialMutationInput
): Promise<DirectoryMaterial> {
  const existing = await getDirectoryMaterialForWorkspace(workspaceOwnerId, id)
  if (!existing)
    throw new DirectoryMaterialsApiError("NOT_FOUND", "Материал не найден", 404)

  await assertDirectoryMaterialUniqueFields(workspaceOwnerId, input, id)

  const { error } = await supabase
    .from("directory_materials")
    .update({
      ...toMaterialMutationRow(workspaceOwnerId, userId, input),
      version: existing.version + 1,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("deleted_at", null)

  if (error) throw error

  const material = await getDirectoryMaterialForWorkspace(workspaceOwnerId, id)
  if (!material) {
    throw new DirectoryMaterialsApiError(
      "INTERNAL_ERROR",
      "Обновлённый материал не найден",
      500
    )
  }

  return material
}

export async function archiveDirectoryMaterialForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string
): Promise<DirectoryMaterial> {
  const existing = await getDirectoryMaterialForWorkspace(workspaceOwnerId, id)
  if (!existing)
    throw new DirectoryMaterialsApiError("NOT_FOUND", "Материал не найден", 404)

  const { error } = await supabase
    .from("directory_materials")
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

  const material = await getDirectoryMaterialForWorkspace(workspaceOwnerId, id)
  if (!material) {
    throw new DirectoryMaterialsApiError(
      "INTERNAL_ERROR",
      "Архивированный материал не найден",
      500
    )
  }

  return material
}

export async function getDirectoryMaterialCategoriesForWorkspace(
  workspaceOwnerId: string,
  params: NormalizedCategoriesParams
): Promise<DirectoryMaterialsCategoriesResponse> {
  let materialQuery = supabase
    .from("directory_materials")
    .select("category,subcategory,unit_code,unit_label,supplier_name")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", params.status)
    .is("deleted_at", null)

  if (params.category)
    materialQuery = materialQuery.eq("category", params.category)
  if (params.subcategory)
    materialQuery = materialQuery.eq("subcategory", params.subcategory)

  const { data, error } = await materialQuery
  if (error) throw error

  const categoryMap = new Map<string, DirectoryMaterialCategoryOption>()
  const unitMap = new Map<string, DirectoryMaterialUnitOption>()
  const supplierMap = new Map<string, DirectoryMaterialSupplierOption>()

  for (const row of (data ?? []) as Array<{
    category: string | null
    subcategory: string | null
    unit_code: string | null
    unit_label: string | null
    supplier_name: string | null
  }>) {
    if (row.category) {
      const current = categoryMap.get(row.category) ?? {
        category: row.category,
        total: 0,
        subcategories: [],
      }
      current.total += 1
      if (row.subcategory) {
        const existing = current.subcategories.find(
          (item) => item.name === row.subcategory
        )
        if (existing) existing.total += 1
        else current.subcategories.push({ name: row.subcategory, total: 1 })
      }
      categoryMap.set(row.category, current)
    }

    if (row.unit_code || row.unit_label) {
      const code = row.unit_code || row.unit_label || ""
      const label = row.unit_label || row.unit_code || code
      const current = unitMap.get(code) ?? { code, label, total: 0 }
      current.total += 1
      unitMap.set(code, current)
    }

    if (row.supplier_name) {
      const current = supplierMap.get(row.supplier_name) ?? {
        name: row.supplier_name,
        total: 0,
      }
      current.total += 1
      supplierMap.set(row.supplier_name, current)
    }
  }

  const sortByTotalAndName =
    <T extends { total: number }>(getName: (item: T) => string) =>
    (a: T, b: T) =>
      b.total - a.total || getName(a).localeCompare(getName(b), "ru")

  const categories = Array.from(categoryMap.values())
    .map((item) => ({
      ...item,
      subcategories: item.subcategories.sort(
        sortByTotalAndName((subcategory) => subcategory.name)
      ),
    }))
    .sort(sortByTotalAndName((category) => category.category))

  const units = Array.from(unitMap.values()).sort(
    sortByTotalAndName((unit) => unit.label)
  )
  const suppliers = Array.from(supplierMap.values()).sort(
    sortByTotalAndName((supplier) => supplier.name)
  )

  return {
    data: { categories, units, suppliers },
    meta: {
      totalCategories: categories.length,
      totalUnits: units.length,
      totalSuppliers: suppliers.length,
    },
  }
}
