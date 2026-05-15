import { supabase } from "@/db"
import type {
  DirectoryMaterial,
  DirectoryMaterialCategoryOption,
  DirectoryMaterialSupplierOption,
  DirectoryMaterialsCategoriesResponse,
  DirectoryMaterialsListMeta,
  DirectoryMaterialsListParams,
  DirectoryMaterialsListResponse,
  DirectoryMaterialUnitOption,
} from "../types"

type NormalizedListParams = Required<
  Pick<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<DirectoryMaterialsListParams, "status" | "limit" | "cursor" | "sort">

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
  source_name: string | null
  source_external_row_key: string | null
  status: "active" | "archived"
  version: number
  created_at: string
  updated_at: string
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`)
}

function toNumber(value: string | number) {
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapDirectoryMaterialRow(row: DirectoryMaterialDbRow): DirectoryMaterial {
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

function applyDirectoryMaterialFilters<T extends { or: (filters: string) => T; eq: (column: string, value: string) => T }>(
  query: T,
  params: NormalizedListParams
) {
  let scoped = query

  if (params.category) scoped = scoped.eq("category", params.category)
  if (params.subcategory) scoped = scoped.eq("subcategory", params.subcategory)
  if (params.unit) scoped = scoped.eq("unit_code", normalizeSearch(params.unit))
  if (params.supplier) scoped = scoped.eq("supplier_name", params.supplier)

  if (params.q) {
    const q = escapeLike(normalizeSearch(params.q))
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

  return scoped
}

function applyDirectoryMaterialSort<T extends { order: (column: string, options?: { ascending?: boolean }) => T }>(
  query: T,
  params: NormalizedListParams
) {
  if (params.sort === "name_asc") {
    return query.order("normalized_name", { ascending: true }).order("id", { ascending: true })
  }

  return query.order("updated_at", { ascending: false }).order("id", { ascending: true })
}

export async function listDirectoryMaterialsForWorkspace(
  workspaceOwnerId: string,
  params: NormalizedListParams
): Promise<DirectoryMaterialsListResponse> {
  const from = params.cursor
  const to = params.cursor + params.limit

  let query = supabase
    .from("directory_materials")
    .select(
      "id,name,unit_code,unit_label,price_amount,currency_code,category,subcategory,code,supplier_name,supplier_id,image_url,description,source_name,source_external_row_key,status,version,created_at,updated_at",
      { count: "exact" }
    )
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

  const meta: DirectoryMaterialsListMeta = {
    limit: params.limit,
    cursor: params.cursor,
    nextCursor: hasMore ? params.cursor + params.limit : null,
    hasMore,
    total: count ?? params.cursor + visibleRows.length + (hasMore ? 1 : 0),
  }

  return {
    data: visibleRows.map(mapDirectoryMaterialRow),
    meta,
  }
}

export async function getDirectoryMaterialForWorkspace(
  workspaceOwnerId: string,
  id: string
): Promise<DirectoryMaterial | null> {
  const { data, error } = await supabase
    .from("directory_materials")
    .select(
      "id,name,unit_code,unit_label,price_amount,currency_code,category,subcategory,code,supplier_name,supplier_id,image_url,description,source_name,source_external_row_key,status,version,created_at,updated_at"
    )
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

export async function getDirectoryMaterialCategoriesForWorkspace(
  workspaceOwnerId: string,
  status: "active" | "archived" = "active"
): Promise<DirectoryMaterialsCategoriesResponse> {
  const { data, error } = await supabase
    .from("directory_materials")
    .select("category,subcategory,unit_code,unit_label,supplier_name")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", status)
    .is("deleted_at", null)

  if (error) throw error

  const categoryMap = new Map<string, { total: number; subcategories: Map<string, number> }>()
  const unitMap = new Map<string, DirectoryMaterialUnitOption>()
  const supplierMap = new Map<string, DirectoryMaterialSupplierOption>()

  for (const row of (data ?? []) as Array<{
    category: string
    subcategory: string | null
    unit_code: string
    unit_label: string
    supplier_name: string | null
  }>) {
    const category = row.category
    const categoryEntry = categoryMap.get(category) ?? { total: 0, subcategories: new Map<string, number>() }
    categoryEntry.total += 1
    if (row.subcategory) {
      categoryEntry.subcategories.set(
        row.subcategory,
        (categoryEntry.subcategories.get(row.subcategory) ?? 0) + 1
      )
    }
    categoryMap.set(category, categoryEntry)

    const unitEntry = unitMap.get(row.unit_code) ?? {
      code: row.unit_code,
      label: row.unit_label,
      total: 0,
    }
    unitEntry.total += 1
    unitMap.set(row.unit_code, unitEntry)

    if (row.supplier_name) {
      const supplierEntry = supplierMap.get(row.supplier_name) ?? {
        name: row.supplier_name,
        total: 0,
      }
      supplierEntry.total += 1
      supplierMap.set(row.supplier_name, supplierEntry)
    }
  }

  const categories: DirectoryMaterialCategoryOption[] = Array.from(categoryMap.entries())
    .map(([category, entry]) => ({
      category,
      total: entry.total,
      subcategories: Array.from(entry.subcategories.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => a.name.localeCompare(b.name, "ru")),
    }))
    .sort((a, b) => a.category.localeCompare(b.category, "ru"))

  const units = Array.from(unitMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "ru")
  )
  const suppliers = Array.from(supplierMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ru")
  )

  return {
    data: {
      categories,
      units,
      suppliers,
    },
    meta: {
      totalCategories: categories.length,
      totalUnits: units.length,
      totalSuppliers: suppliers.length,
    },
  }
}
