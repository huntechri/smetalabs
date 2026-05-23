import { supabase } from "@/db"
import { ProjectsApiError } from "../api/projects-errors"
import type {
  ProjectMutationInput,
  ProjectRow,
  ProjectsListParams,
  ProjectsListResponse,
} from "@/types/project"

type NormalizedListParams = Required<
  Pick<ProjectsListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<ProjectsListParams, "status" | "limit" | "cursor" | "sort">

type ProjectDbRow = {
  id: string
  title: string
  customer_counterparty_id: string | null
  customer_name: string | null
  address: string | null
  budget_amount: string | number | null
  start_date: string | null
  end_date: string | null
  status: "new" | "in_progress" | "completed"
  progress: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

type ProjectIdRow = { id: string }
type CustomerCounterpartyRow = { id: string; name: string }

const PROJECT_SELECT = [
  "id",
  "title",
  "customer_counterparty_id",
  "customer_name",
  "address",
  "budget_amount",
  "start_date",
  "end_date",
  "status",
  "progress",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(",")

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

function toProjectRows(data: unknown) {
  return ((data ?? []) as ProjectDbRow[]).filter(Boolean)
}

function toProjectRow(data: unknown) {
  return data as ProjectDbRow
}

function toIdRow(data: unknown) {
  return data as ProjectIdRow
}

function toNullableNumber(value: string | number | null) {
  if (value === null) return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapProjectRow(row: ProjectDbRow): ProjectRow {
  return {
    id: row.id,
    title: row.title,
    customerCounterpartyId: row.customer_counterparty_id,
    customerName: row.customer_name,
    address: row.address,
    budgetAmount: toNullableNumber(row.budget_amount),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    progress: row.progress,
    metadata: {
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    },
  }
}

function applyProjectFilters<
  T extends {
    or: (filters: string) => T
    eq: (column: string, value: string) => T
  },
>(query: T, params: NormalizedListParams) {
  let scoped = query

  if (params.status !== "all") {
    scoped = scoped.eq("status", params.status)
  }

  if (params.q) {
    const tokens = getSearchTokens(params.q)

    for (const token of tokens) {
      const q = escapeLike(token)
      scoped = scoped.or(
        [
          `normalized_title.ilike.%${q}%`,
          `search_text.ilike.%${q}%`,
          `customer_name.ilike.%${q}%`,
          `address.ilike.%${q}%`,
        ].join(",")
      )
    }
  }

  return scoped
}

function applyProjectSort<
  T extends { order: (column: string, options?: { ascending?: boolean }) => T },
>(query: T, params: NormalizedListParams) {
  if (params.sort === "title_asc") {
    return query
      .order("normalized_title", { ascending: true })
      .order("id", { ascending: true })
  }

  return query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
}

async function assertProjectTitleUnique(
  workspaceOwnerId: string,
  title: string,
  currentProjectId?: string
) {
  let query = supabase
    .from("projects")
    .select("id")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("normalized_title", normalizeSearch(title))
    .is("archived_at", null)
    .is("deleted_at", null)
    .limit(1)

  if (currentProjectId) query = query.neq("id", currentProjectId)

  const { data, error } = await query
  if (error) throw error
  if ((data ?? []).length > 0) {
    throw new ProjectsApiError(
      "BAD_REQUEST",
      "Проект с таким названием уже существует",
      400
    )
  }
}

async function getCustomerCounterpartyForWorkspace(
  workspaceOwnerId: string,
  customerCounterpartyId?: string | null
): Promise<CustomerCounterpartyRow | null> {
  if (!customerCounterpartyId) return null

  const { data, error } = await supabase
    .from("directory_counterparties")
    .select("id,name")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", customerCounterpartyId)
    .eq("type", "customer")
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data)
    throw new ProjectsApiError(
      "BAD_REQUEST",
      "Выбранный заказчик не найден",
      400
    )

  return data as CustomerCounterpartyRow
}

async function toProjectMutationRow(
  workspaceOwnerId: string,
  userId: string,
  input: ProjectMutationInput
) {
  const customer = await getCustomerCounterpartyForWorkspace(
    workspaceOwnerId,
    input.customerCounterpartyId
  )

  return {
    workspace_owner_id: workspaceOwnerId,
    title: input.title.trim().replace(/\s+/g, " "),
    normalized_title: "pending",
    customer_counterparty_id: customer?.id ?? null,
    customer_name: customer?.name ?? null,
    address: toNullableString(input.address),
    budget_amount: null,
    start_date: toNullableString(input.startDate),
    end_date: toNullableString(input.endDate),
    status: input.status ?? "new",
    progress: 0,
    search_text: "pending",
    updated_by: userId,
  }
}

export async function listProjectsForWorkspace(
  workspaceOwnerId: string,
  params: NormalizedListParams
): Promise<ProjectsListResponse> {
  const from = params.cursor
  const to = params.cursor + params.limit

  let query = supabase
    .from("projects")
    .select(PROJECT_SELECT, { count: "exact" })
    .eq("workspace_owner_id", workspaceOwnerId)
    .is("archived_at", null)
    .is("deleted_at", null)

  query = applyProjectFilters(query, params)
  query = applyProjectSort(query, params)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  const rows = toProjectRows(data)
  const visibleRows = rows.slice(0, params.limit)
  const hasMore = rows.length > params.limit

  return {
    data: visibleRows.map(mapProjectRow),
    meta: {
      limit: params.limit,
      cursor: params.cursor,
      nextCursor: hasMore ? params.cursor + params.limit : null,
      hasMore,
      total: count ?? params.cursor + visibleRows.length + (hasMore ? 1 : 0),
    },
  }
}

export async function getProjectForWorkspace(
  workspaceOwnerId: string,
  id: string,
  includeArchived = false
): Promise<ProjectRow | null> {
  let query = supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("deleted_at", null)

  if (!includeArchived) query = query.is("archived_at", null)

  const { data, error } = await query.single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }

  return mapProjectRow(toProjectRow(data))
}

export async function createProjectForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  input: ProjectMutationInput
): Promise<ProjectRow> {
  await assertProjectTitleUnique(workspaceOwnerId, input.title)

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...(await toProjectMutationRow(workspaceOwnerId, userId, input)),
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) throw error

  const created = toIdRow(data)
  const project = await getProjectForWorkspace(workspaceOwnerId, created.id)
  if (!project)
    throw new ProjectsApiError(
      "INTERNAL_ERROR",
      "Созданный проект не найден",
      500
    )

  return project
}

export async function updateProjectForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string,
  input: ProjectMutationInput
): Promise<ProjectRow> {
  const existing = await getProjectForWorkspace(workspaceOwnerId, id)
  if (!existing)
    throw new ProjectsApiError("NOT_FOUND", "Проект не найден", 404)

  await assertProjectTitleUnique(workspaceOwnerId, input.title, id)

  const { error } = await supabase
    .from("projects")
    .update(await toProjectMutationRow(workspaceOwnerId, userId, input))
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("archived_at", null)
    .is("deleted_at", null)

  if (error) throw error

  const project = await getProjectForWorkspace(workspaceOwnerId, id)
  if (!project)
    throw new ProjectsApiError(
      "INTERNAL_ERROR",
      "Обновлённый проект не найден",
      500
    )

  return project
}

export async function archiveProjectForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string
): Promise<ProjectRow> {
  const existing = await getProjectForWorkspace(workspaceOwnerId, id)
  if (!existing)
    throw new ProjectsApiError("NOT_FOUND", "Проект не найден", 404)

  const { error } = await supabase
    .from("projects")
    .update({
      archived_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("archived_at", null)
    .is("deleted_at", null)

  if (error) throw error

  return existing
}
