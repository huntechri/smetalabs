import { randomUUID } from "node:crypto"
import { supabase } from "@/db"
import { DirectoryMaterialsApiError } from "../api/directory-materials-errors"
import type {
  DirectoryMaterialImportApplyInput,
  DirectoryMaterialImportApplyResponse,
  DirectoryMaterialImportJob,
  DirectoryMaterialImportNormalizedRow,
  DirectoryMaterialImportRowAction,
  DirectoryMaterialImportRowStatus,
} from "../types"

const DEFAULT_FAST_APPLY_BATCH_SIZE = 5000
const MAX_FAST_APPLY_BATCH_SIZE = 5000
const UPDATE_PRICE_CONCURRENCY = 25

type ImportJobDbRow = {
  id: string
  status: DirectoryMaterialImportJob["status"]
  source_name: string | null
  file_name: string | null
  file_mime_type: string | null
  file_size_bytes: number | string | null
  total_rows: number | string
  parsed_rows: number | string
  valid_rows: number | string
  warning_rows: number | string
  error_rows: number | string
  duplicate_rows: number | string
  conflict_rows: number | string
  applied_rows: number | string
  skipped_rows: number | string
  options: Record<string, unknown> | null
  summary: Record<string, unknown> | null
  last_error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

type ImportRowDbRow = {
  id: string
  job_id: string
  row_number: number
  normalized_data: Record<string, unknown> | null
  status: DirectoryMaterialImportRowStatus
  action: DirectoryMaterialImportRowAction | null
  duplicate_material_id: string | null
  applied_at: string | null
}

type ApplyRow = {
  id: string
  rowNumber: number
  action: DirectoryMaterialImportRowAction | null
  normalizedData: DirectoryMaterialImportNormalizedRow
  duplicateMaterialId: string | null
  materialId: string
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function cleanString(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null
  const next = String(value).trim().replace(/\s+/g, " ")
  return next.length > 0 ? next : null
}

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeUnitCode(unit: string) {
  return normalizeSearch(unit).replace(/\s+/g, "_")
}

function toTextArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map((item) => cleanString(item)).filter(Boolean))) as string[]
}

function mapJob(row: ImportJobDbRow): DirectoryMaterialImportJob {
  return {
    id: row.id,
    status: row.status,
    sourceName: row.source_name,
    fileName: row.file_name,
    fileMimeType: row.file_mime_type,
    fileSizeBytes: row.file_size_bytes === null ? null : Number(row.file_size_bytes),
    totalRows: toNumber(row.total_rows),
    parsedRows: toNumber(row.parsed_rows),
    validRows: toNumber(row.valid_rows),
    warningRows: toNumber(row.warning_rows),
    errorRows: toNumber(row.error_rows),
    duplicateRows: toNumber(row.duplicate_rows),
    conflictRows: toNumber(row.conflict_rows),
    appliedRows: toNumber(row.applied_rows),
    skippedRows: toNumber(row.skipped_rows),
    options: row.options ?? {},
    summary: row.summary ?? {},
    lastError: row.last_error,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toApplyRow(row: ImportRowDbRow): ApplyRow {
  const normalizedData = (row.normalized_data ?? {}) as DirectoryMaterialImportNormalizedRow
  return {
    id: row.id,
    rowNumber: row.row_number,
    action: row.action,
    normalizedData,
    duplicateMaterialId: row.duplicate_material_id,
    materialId: row.action === "create" ? randomUUID() : row.duplicate_material_id ?? randomUUID(),
  }
}

function toInsertRow(workspaceOwnerId: string, userId: string, row: ApplyRow) {
  const data = row.normalizedData
  const unit = data.unit.trim().replace(/\s+/g, " ")
  return {
    id: row.materialId,
    workspace_owner_id: workspaceOwnerId,
    name: data.name.trim().replace(/\s+/g, " "),
    normalized_name: "pending",
    unit_code: normalizeUnitCode(unit),
    unit_label: unit,
    price_amount: data.price,
    currency_code: data.currencyCode ?? "RUB",
    category: data.category.trim().replace(/\s+/g, " "),
    subcategory: cleanString(data.subcategory),
    code: cleanString(data.code),
    supplier_name: cleanString(data.supplierName),
    supplier_id: null,
    image_url: cleanString(data.imageUrl),
    description: cleanString(data.description),
    aliases: toTextArray(data.aliases),
    keywords: toTextArray(data.keywords),
    source_name: cleanString(data.sourceName),
    source_external_row_key: cleanString(data.sourceExternalRowKey),
    dedupe_fingerprint: "pending",
    search_text: "pending",
    search_fts: "",
    created_by: userId,
    updated_by: userId,
    status: "active",
    version: 1,
  }
}

async function getJobRow(workspaceOwnerId: string, id: string) {
  const { data, error } = await supabase
    .from("directory_material_import_jobs")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as ImportJobDbRow | null
}

async function markImportJobFailed(workspaceOwnerId: string, id: string, error: unknown) {
  await supabase
    .from("directory_material_import_jobs")
    .update({
      status: "failed",
      last_error: error instanceof Error ? error.message : "Не удалось быстро применить пакет импорта материалов",
      completed_at: new Date().toISOString(),
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
}

async function updateMaterialPrices(workspaceOwnerId: string, userId: string, rows: ApplyRow[]) {
  const appliedIds: string[] = []

  for (let index = 0; index < rows.length; index += UPDATE_PRICE_CONCURRENCY) {
    const group = rows.slice(index, index + UPDATE_PRICE_CONCURRENCY)
    await Promise.all(group.map(async (row) => {
      if (!row.duplicateMaterialId) return
      const { error } = await supabase
        .from("directory_materials")
        .update({
          price_amount: row.normalizedData.price,
          currency_code: row.normalizedData.currencyCode ?? "RUB",
          updated_by: userId,
        })
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("id", row.duplicateMaterialId)
        .is("deleted_at", null)

      if (error) throw error
      appliedIds.push(row.duplicateMaterialId)
    }))
  }

  return appliedIds
}

export async function applyFastDirectoryMaterialImportBatchForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string,
  input: DirectoryMaterialImportApplyInput = {}
): Promise<DirectoryMaterialImportApplyResponse> {
  const jobRow = await getJobRow(workspaceOwnerId, id)
  if (!jobRow) throw new DirectoryMaterialsApiError("NOT_FOUND", "Import job материалов не найден", 404)
  if (!["ready_for_review", "applying"].includes(jobRow.status)) {
    throw new DirectoryMaterialsApiError("BAD_REQUEST", "Импорт материалов можно применять только после загрузки всех пакетов", 400)
  }

  const requestedBatchSize = input.batchSize ?? DEFAULT_FAST_APPLY_BATCH_SIZE
  const batchSize = Math.max(1, Math.min(Math.max(requestedBatchSize, DEFAULT_FAST_APPLY_BATCH_SIZE), MAX_FAST_APPLY_BATCH_SIZE))
  await supabase
    .from("directory_material_import_jobs")
    .update({ status: "applying", started_at: jobRow.started_at ?? new Date().toISOString(), last_error: null })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)

  const { data, error } = await supabase
    .from("directory_material_import_rows")
    .select("id,job_id,row_number,normalized_data,status,action,duplicate_material_id,applied_at")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", id)
    .in("action", ["create", "update"])
    .in("status", ["valid", "warning"])
    .is("applied_at", null)
    .order("row_number", { ascending: true })
    .limit(batchSize + 1)

  if (error) throw error
  const fetchedRows = ((data ?? []) as ImportRowDbRow[]).map(toApplyRow)
  const rowsToApply = fetchedRows.slice(0, batchSize)
  const hasMore = fetchedRows.length > batchSize

  if (rowsToApply.length === 0) {
    const skippedRows = Math.max(0, toNumber(jobRow.total_rows) - toNumber(jobRow.applied_rows))
    const { data: completedJob, error: updateError } = await supabase
      .from("directory_material_import_jobs")
      .update({ status: "completed", skipped_rows: skippedRows, completed_at: new Date().toISOString() })
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) throw updateError
    return { data: { job: mapJob(completedJob as ImportJobDbRow), appliedRows: 0, skippedRows, appliedMaterialIds: [], hasMore: false } }
  }

  try {
    const createRows = rowsToApply.filter((row) => row.action === "create")
    const updateRows = rowsToApply.filter((row) => row.action === "update")
    const createdIds = createRows.map((row) => row.materialId)

    if (createRows.length > 0) {
      const { error: insertError } = await supabase
        .from("directory_materials")
        .insert(createRows.map((row) => toInsertRow(workspaceOwnerId, userId, row)))
      if (insertError) throw insertError
    }

    const updatedIds = await updateMaterialPrices(workspaceOwnerId, userId, updateRows)
    const appliedAt = new Date().toISOString()

    const { error: rowsUpdateError } = await supabase
      .from("directory_material_import_rows")
      .update({ status: "applied", applied_at: appliedAt })
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("job_id", id)
      .in("id", rowsToApply.map((row) => row.id))

    if (rowsUpdateError) throw rowsUpdateError

    const nextAppliedRows = toNumber(jobRow.applied_rows) + rowsToApply.length
    const completed = !hasMore
    const skippedRows = completed ? Math.max(0, toNumber(jobRow.total_rows) - nextAppliedRows) : toNumber(jobRow.skipped_rows)
    const { data: updatedJob, error: updateError } = await supabase
      .from("directory_material_import_jobs")
      .update({
        status: completed ? "completed" : "applying",
        applied_rows: nextAppliedRows,
        skipped_rows: skippedRows,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) throw updateError
    return {
      data: {
        job: mapJob(updatedJob as ImportJobDbRow),
        appliedRows: rowsToApply.length,
        skippedRows,
        appliedMaterialIds: [...createdIds, ...updatedIds],
        hasMore,
      },
    }
  } catch (err) {
    await markImportJobFailed(workspaceOwnerId, id, err)
    throw err
  }
}
