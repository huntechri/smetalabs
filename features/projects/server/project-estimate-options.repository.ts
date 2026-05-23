import { supabase } from "@/db"
import type {
  ProjectEstimateMaterialOptionRow,
  ProjectEstimateOptionRow,
  ProjectEstimateOptionsResponse,
} from "@/types/project-estimate-content"
import type { EstimateContentOptionsParams } from "./project-estimate-content.schemas"

type DirectoryWorkOptionRow = {
  id: string
  code: string | null
  title: string
  unit_code: string
  unit_label: string
  rate_amount: string | number
  category: string | null
}

type DirectoryMaterialOptionRow = {
  id: string
  code: string | null
  name: string
  unit_code: string
  unit_label: string
  price_amount: string | number
  category: string | null
  supplier_name: string | null
}

const MATERIAL_OPTION_SELECT =
  "id,code,name,unit_code,unit_label,price_amount,category,supplier_name"
const ESTIMATE_OPTION_SEARCH_MIN_LENGTH = 3

function normalizeSearch(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function toNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function buildMeta<T>(rows: T[], params: EstimateContentOptionsParams) {
  const visibleRows = rows.slice(0, params.limit)
  const hasMore = rows.length > params.limit

  return {
    data: visibleRows,
    meta: {
      q: params.q,
      limit: params.limit,
      cursor: params.cursor,
      nextCursor: hasMore ? params.cursor + params.limit : null,
      hasMore,
    },
  }
}

function mapWorkOption(row: DirectoryWorkOptionRow): ProjectEstimateOptionRow {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    unitCode: row.unit_code,
    unitLabel: row.unit_label,
    price: toNumber(row.rate_amount),
    category: row.category ?? "Без категории",
  }
}

function mapMaterialOption(
  row: DirectoryMaterialOptionRow
): ProjectEstimateMaterialOptionRow {
  return {
    id: row.id,
    code: row.code,
    title: row.name,
    unitCode: row.unit_code,
    unitLabel: row.unit_label,
    price: toNumber(row.price_amount),
    category: row.category ?? "Без категории",
    supplierName: row.supplier_name,
  }
}

export async function listProjectEstimateWorkOptionsForWorkspace(
  workspaceOwnerId: string,
  _projectId: string,
  _recordId: string,
  params: EstimateContentOptionsParams
): Promise<ProjectEstimateOptionsResponse<ProjectEstimateOptionRow>> {
  const normalizedQuery = normalizeSearch(params.q)
  if (normalizedQuery.length < ESTIMATE_OPTION_SEARCH_MIN_LENGTH) {
    return buildMeta([], params)
  }

  const { data, error } = await supabase.rpc("search_directory_works", {
    p_workspace_owner_id: workspaceOwnerId,
    p_q: normalizedQuery,
    p_category: null,
    p_subcategory: null,
    p_unit: null,
    p_status: "active",
    p_limit: params.limit + 1,
    p_cursor: params.cursor,
    p_sort: "relevance",
  })

  if (error) throw error

  const rows = ((data ?? []) as DirectoryWorkOptionRow[]).map(mapWorkOption)
  return buildMeta(rows, params)
}

export async function listProjectEstimateMaterialOptionsForWorkspace(
  workspaceOwnerId: string,
  _projectId: string,
  _recordId: string,
  params: EstimateContentOptionsParams
): Promise<ProjectEstimateOptionsResponse<ProjectEstimateMaterialOptionRow>> {
  const normalizedQuery = normalizeSearch(params.q)
  const limitWithSentinel = params.limit + 1

  if (normalizedQuery.length < ESTIMATE_OPTION_SEARCH_MIN_LENGTH) {
    return buildMeta([], params)
  }

  const { data, error } = await supabase
    .from("directory_materials")
    .select(MATERIAL_OPTION_SELECT)
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", "active")
    .is("deleted_at", null)
    .textSearch("search_fts", normalizedQuery, {
      type: "websearch",
      config: "simple",
    })
    .order("normalized_name", { ascending: true })
    .range(params.cursor, params.cursor + limitWithSentinel - 1)

  if (error) throw error

  const rows = ((data ?? []) as DirectoryMaterialOptionRow[]).map(
    mapMaterialOption
  )
  return buildMeta(rows, params)
}
