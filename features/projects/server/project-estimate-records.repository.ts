import { supabase } from "@/db"
import { ProjectsApiError } from "../api/projects-errors"
import type {
  ProjectEstimateRecordMutationInput,
  ProjectEstimateRecordRow,
  ProjectEstimateRecordsListResponse,
} from "@/types/project-estimate-record"

type NormalizedListParams = {
  limit: number
  cursor: number
}

type ProjectEstimateRecordDbRow = {
  id: string
  project_id: string
  name: string
  type: string
  status: "new" | "in_progress" | "completed"
  amount: string | number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

type ProjectEstimateRecordIdRow = { id: string }

const PROJECT_ESTIMATE_RECORD_SELECT = [
  "id",
  "project_id",
  "name",
  "type",
  "status",
  "amount",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(",")

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function toMoneyNumber(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toRows(data: unknown) {
  return ((data ?? []) as ProjectEstimateRecordDbRow[]).filter(Boolean)
}

function toRow(data: unknown) {
  return data as ProjectEstimateRecordDbRow
}

function toIdRow(data: unknown) {
  return data as ProjectEstimateRecordIdRow
}

function mapRow(row: ProjectEstimateRecordDbRow): ProjectEstimateRecordRow {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    type: row.type,
    status: row.status,
    amount: toMoneyNumber(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: {
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    },
  }
}

async function assertProjectExists(
  workspaceOwnerId: string,
  projectId: string
) {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", projectId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ProjectsApiError("NOT_FOUND", "Проект не найден", 404)
}

async function assertNameUnique(
  workspaceOwnerId: string,
  projectId: string,
  name: string,
  currentRecordId?: string
) {
  let query = supabase
    .from("project_estimate_records")
    .select("id")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .eq("normalized_name", normalizeName(name))
    .is("archived_at", null)
    .is("deleted_at", null)
    .limit(1)

  if (currentRecordId) query = query.neq("id", currentRecordId)

  const { data, error } = await query
  if (error) throw error
  if ((data ?? []).length > 0) {
    throw new ProjectsApiError(
      "BAD_REQUEST",
      "Смета с таким названием уже есть",
      400
    )
  }
}

export async function listProjectEstimateRecordsForWorkspace(
  workspaceOwnerId: string,
  projectId: string,
  params: NormalizedListParams
): Promise<ProjectEstimateRecordsListResponse> {
  await assertProjectExists(workspaceOwnerId, projectId)

  const from = params.cursor
  const to = params.cursor + params.limit

  const { data, error, count } = await supabase
    .from("project_estimate_records")
    .select(PROJECT_ESTIMATE_RECORD_SELECT, { count: "exact" })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to)

  if (error) throw error

  const rows = toRows(data)
  const visibleRows = rows.slice(0, params.limit)
  const hasMore = rows.length > params.limit

  return {
    data: visibleRows.map(mapRow),
    meta: {
      projectId,
      limit: params.limit,
      cursor: params.cursor,
      nextCursor: hasMore ? params.cursor + params.limit : null,
      hasMore,
      total: count ?? params.cursor + visibleRows.length + (hasMore ? 1 : 0),
    },
  }
}

export async function getProjectEstimateRecordForWorkspace(
  workspaceOwnerId: string,
  projectId: string,
  recordId: string
): Promise<ProjectEstimateRecordRow | null> {
  const { data, error } = await supabase
    .from("project_estimate_records")
    .select(PROJECT_ESTIMATE_RECORD_SELECT)
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .eq("id", recordId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapRow(toRow(data))
}

export async function createProjectEstimateRecordForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  projectId: string,
  input: ProjectEstimateRecordMutationInput
): Promise<ProjectEstimateRecordRow> {
  await assertProjectExists(workspaceOwnerId, projectId)
  await assertNameUnique(workspaceOwnerId, projectId, input.name)

  const { data, error } = await supabase
    .from("project_estimate_records")
    .insert({
      workspace_owner_id: workspaceOwnerId,
      project_id: projectId,
      name: input.name.trim().replace(/\s+/g, " "),
      normalized_name: "pending",
      type: input.type ?? "Основная",
      status: input.status ?? "new",
      amount: 0,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single()

  if (error) throw error

  const created = toIdRow(data)
  const record = await getProjectEstimateRecordForWorkspace(
    workspaceOwnerId,
    projectId,
    created.id
  )

  if (!record)
    throw new ProjectsApiError(
      "INTERNAL_ERROR",
      "Созданная смета не найдена",
      500
    )

  return record
}

export async function updateProjectEstimateRecordForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  projectId: string,
  recordId: string,
  input: ProjectEstimateRecordMutationInput
): Promise<ProjectEstimateRecordRow> {
  const existing = await getProjectEstimateRecordForWorkspace(
    workspaceOwnerId,
    projectId,
    recordId
  )
  if (!existing)
    throw new ProjectsApiError("NOT_FOUND", "Смета не найдена", 404)

  await assertNameUnique(workspaceOwnerId, projectId, input.name, recordId)

  const { error } = await supabase
    .from("project_estimate_records")
    .update({
      name: input.name.trim().replace(/\s+/g, " "),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updated_by: userId,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .eq("id", recordId)
    .is("archived_at", null)
    .is("deleted_at", null)

  if (error) throw error

  const updated = await getProjectEstimateRecordForWorkspace(
    workspaceOwnerId,
    projectId,
    recordId
  )
  if (!updated)
    throw new ProjectsApiError(
      "INTERNAL_ERROR",
      "Обновлённая смета не найдена",
      500
    )

  return updated
}

export async function deleteProjectEstimateRecordForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  projectId: string,
  recordId: string
): Promise<ProjectEstimateRecordRow> {
  const existing = await getProjectEstimateRecordForWorkspace(
    workspaceOwnerId,
    projectId,
    recordId
  )
  if (!existing)
    throw new ProjectsApiError("NOT_FOUND", "Смета не найдена", 404)

  const { error } = await supabase
    .from("project_estimate_records")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .eq("id", recordId)
    .is("archived_at", null)
    .is("deleted_at", null)

  if (error) throw error

  return existing
}
