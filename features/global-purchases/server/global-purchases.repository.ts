import { supabase } from "@/db"
import { GlobalPurchasesApiError } from "../api/global-purchases-errors"
import type {
  GlobalPurchaseMaterialOption,
  GlobalPurchaseMutationInput,
  GlobalPurchaseRow,
  GlobalPurchasesListParams,
  GlobalPurchasesListResponse,
} from "@/types/global-purchases"

type NormalizedListParams = Required<
  Pick<GlobalPurchasesListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<GlobalPurchasesListParams, "status" | "limit" | "cursor" | "sort">

type GlobalPurchaseDbRow = {
  id: string
  title: string
  unit: string
  plan_quantity: string | number
  plan_price: string | number
  fact_quantity: string | number | null
  fact_price: string | number | null
  supplier_id: string | null
  supplier_name: string | null
  project_id: string | null
  project_title: string | null
  purchase_date: string | null
  status:
    | "planned"
    | "ordered"
    | "partially_received"
    | "received"
    | "cancelled"
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

type ProjectSnapshotRow = { id: string; title: string }
type MaterialOptionDbRow = {
  id: string
  name: string
  unit_code: string
  unit_label: string
  price_amount: string | number
  category: string
}

const GLOBAL_PURCHASE_SELECT = [
  "id",
  "title",
  "unit",
  "plan_quantity",
  "plan_price",
  "fact_quantity",
  "fact_price",
  "supplier_id",
  "supplier_name",
  "project_id",
  "project_title",
  "purchase_date",
  "status",
  "notes",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(",")

const MATERIAL_OPTION_SELECT =
  "id,name,unit_code,unit_label,price_amount,category"
const MAX_SEARCH_TOKENS = 8

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
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
  return value && value.trim() ? value.trim().replace(/\s+/g, " ") : null
}

function toNumber(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNullableNumber(value: string | number | null) {
  if (value === null) return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toGlobalPurchaseRows(data: unknown) {
  return ((data ?? []) as GlobalPurchaseDbRow[]).filter(Boolean)
}

function toGlobalPurchaseRow(data: unknown) {
  return data as GlobalPurchaseDbRow
}

function getFactTotal(factQuantity: number | null, factPrice: number | null) {
  if (factQuantity === null || factPrice === null) return null
  return factQuantity * factPrice
}

function mapGlobalPurchaseRow(row: GlobalPurchaseDbRow): GlobalPurchaseRow {
  const planQuantity = toNumber(row.plan_quantity)
  const planPrice = toNumber(row.plan_price)
  const factQuantity = toNullableNumber(row.fact_quantity)
  const factPrice = toNullableNumber(row.fact_price)
  const planTotal = planQuantity * planPrice
  const factTotal = getFactTotal(factQuantity, factPrice)

  return {
    id: row.id,
    title: row.title,
    unit: row.unit,
    planQuantity,
    planPrice,
    factQuantity,
    factPrice,
    planTotal,
    factTotal,
    deviationTotal: factTotal === null ? null : planTotal - factTotal,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    projectId: row.project_id,
    projectTitle: row.project_title,
    purchaseDate: row.purchase_date,
    status: row.status,
    notes: row.notes,
    metadata: {
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    },
  }
}

function mapMaterialOption(
  row: MaterialOptionDbRow
): GlobalPurchaseMaterialOption {
  return {
    id: row.id,
    title: row.name,
    unit: row.unit_label || row.unit_code,
    planPrice: toNumber(row.price_amount),
    category: row.category,
  }
}

function applyGlobalPurchaseFilters<
  T extends {
    or: (filters: string) => T
    eq: (column: string, value: string) => T
    gte: (column: string, value: string) => T
    lte: (column: string, value: string) => T
  },
>(query: T, params: NormalizedListParams) {
  let scoped = query

  if (params.status !== "all") {
    scoped = scoped.eq("status", params.status)
  }

  if (params.projectId) {
    scoped = scoped.eq("project_id", params.projectId)
  }

  if (params.dateFrom) {
    scoped = scoped.gte("purchase_date", params.dateFrom)
  }

  if (params.dateTo) {
    scoped = scoped.lte("purchase_date", params.dateTo)
  }

  if (params.q) {
    const tokens = getSearchTokens(params.q)

    for (const token of tokens) {
      const q = escapeLike(token)
      scoped = scoped.or(
        [
          `normalized_title.ilike.%${q}%`,
          `search_text.ilike.%${q}%`,
          `unit.ilike.%${q}%`,
          `supplier_name.ilike.%${q}%`,
          `project_title.ilike.%${q}%`,
          `notes.ilike.%${q}%`,
        ].join(",")
      )
    }
  }

  return scoped
}

function applyGlobalPurchaseSort<
  T extends {
    order: (
      column: string,
      options?: { ascending?: boolean; nullsFirst?: boolean }
    ) => T
  },
>(query: T, params: NormalizedListParams) {
  if (params.sort === "title_asc") {
    return query
      .order("normalized_title", { ascending: true })
      .order("id", { ascending: true })
  }

  if (params.sort === "updated_desc") {
    return query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
  }

  return query
    .order("project_title", { ascending: true, nullsFirst: false })
    .order("purchase_date", { ascending: true, nullsFirst: false })
    .order("normalized_title", { ascending: true })
    .order("id", { ascending: true })
}

async function getProjectSnapshotForWorkspace(
  workspaceOwnerId: string,
  projectId?: string | null
): Promise<ProjectSnapshotRow | null> {
  if (!projectId) return null

  const { data, error } = await supabase
    .from("projects")
    .select("id,title")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", projectId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data)
    throw new GlobalPurchasesApiError(
      "BAD_REQUEST",
      "Выбранный объект не найден",
      400
    )

  return data as ProjectSnapshotRow
}

async function toGlobalPurchaseMutationRow(
  workspaceOwnerId: string,
  userId: string,
  input: GlobalPurchaseMutationInput
) {
  const project = await getProjectSnapshotForWorkspace(
    workspaceOwnerId,
    input.projectId
  )

  if (input.supplierId) {
    throw new GlobalPurchasesApiError(
      "BAD_REQUEST",
      "Справочник поставщиков ещё не подключён к закупкам",
      400
    )
  }

  return {
    workspace_owner_id: workspaceOwnerId,
    title: input.title.trim().replace(/\s+/g, " "),
    normalized_title: "pending",
    unit: input.unit.trim().replace(/\s+/g, " "),
    plan_quantity: input.planQuantity,
    plan_price: input.planPrice,
    fact_quantity: input.factQuantity ?? null,
    fact_price: input.factPrice ?? null,
    supplier_id: null,
    supplier_name: null,
    project_id: project?.id ?? null,
    project_title: project?.title ?? null,
    purchase_date: toNullableString(input.purchaseDate),
    status: input.status ?? "planned",
    notes: toNullableString(input.notes),
    search_text: "pending",
    updated_by: userId,
  }
}

export async function listGlobalPurchasesForWorkspace(
  workspaceOwnerId: string,
  params: NormalizedListParams
): Promise<GlobalPurchasesListResponse> {
  const from = params.cursor
  const to = params.cursor + params.limit

  let query = supabase
    .from("global_purchases")
    .select(GLOBAL_PURCHASE_SELECT, { count: "exact" })
    .eq("workspace_owner_id", workspaceOwnerId)
    .is("archived_at", null)
    .is("deleted_at", null)

  query = applyGlobalPurchaseFilters(query, params)
  query = applyGlobalPurchaseSort(query, params)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  const rows = toGlobalPurchaseRows(data)
  const visibleRows = rows.slice(0, params.limit)
  const hasMore = rows.length > params.limit

  return {
    data: visibleRows.map(mapGlobalPurchaseRow),
    meta: {
      limit: params.limit,
      cursor: params.cursor,
      nextCursor: hasMore ? params.cursor + params.limit : null,
      hasMore,
      total: count ?? params.cursor + visibleRows.length + (hasMore ? 1 : 0),
    },
  }
}

export async function searchGlobalPurchaseMaterialOptionsForWorkspace(
  workspaceOwnerId: string,
  queryText: string
): Promise<GlobalPurchaseMaterialOption[]> {
  const tokens = getSearchTokens(queryText)
  if (tokens.length === 0) return []

  let query = supabase
    .from("directory_materials")
    .select(MATERIAL_OPTION_SELECT)
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(25)

  for (const token of tokens) {
    const q = escapeLike(token)
    query = query.or(
      [
        `normalized_name.ilike.%${q}%`,
        `search_text.ilike.%${q}%`,
        `code.ilike.%${q}%`,
      ].join(",")
    )
  }

  const { data, error } = await query.order("normalized_name", {
    ascending: true,
  })
  if (error) throw error

  return ((data ?? []) as MaterialOptionDbRow[]).map(mapMaterialOption)
}

export async function getGlobalPurchaseForWorkspace(
  workspaceOwnerId: string,
  id: string,
  includeArchived = false
): Promise<GlobalPurchaseRow | null> {
  let query = supabase
    .from("global_purchases")
    .select(GLOBAL_PURCHASE_SELECT)
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("deleted_at", null)

  if (!includeArchived) query = query.is("archived_at", null)

  const { data, error } = await query.single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }

  return mapGlobalPurchaseRow(toGlobalPurchaseRow(data))
}

export async function createGlobalPurchaseForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  input: GlobalPurchaseMutationInput
): Promise<GlobalPurchaseRow> {
  const { data, error } = await supabase
    .from("global_purchases")
    .insert({
      ...(await toGlobalPurchaseMutationRow(workspaceOwnerId, userId, input)),
      created_by: userId,
    })
    .select(GLOBAL_PURCHASE_SELECT)
    .single()

  if (error) throw error
  return mapGlobalPurchaseRow(toGlobalPurchaseRow(data))
}

export async function updateGlobalPurchaseForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string,
  input: GlobalPurchaseMutationInput
): Promise<GlobalPurchaseRow> {
  const { data, error } = await supabase
    .from("global_purchases")
    .update(await toGlobalPurchaseMutationRow(workspaceOwnerId, userId, input))
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("archived_at", null)
    .is("deleted_at", null)
    .select(GLOBAL_PURCHASE_SELECT)
    .single()

  if (error) {
    if (error.code === "PGRST116")
      throw new GlobalPurchasesApiError("NOT_FOUND", "Закупка не найдена", 404)
    throw error
  }

  return mapGlobalPurchaseRow(toGlobalPurchaseRow(data))
}

export async function archiveGlobalPurchaseForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string
): Promise<GlobalPurchaseRow> {
  const { data, error } = await supabase
    .from("global_purchases")
    .update({
      archived_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("archived_at", null)
    .is("deleted_at", null)
    .select(GLOBAL_PURCHASE_SELECT)
    .single()

  if (error) {
    if (error.code === "PGRST116")
      throw new GlobalPurchasesApiError("NOT_FOUND", "Закупка не найдена", 404)
    throw error
  }

  return mapGlobalPurchaseRow(toGlobalPurchaseRow(data))
}
