import { supabase } from "@/db"
import { DirectoryMaterialsApiError } from "../api/directory-materials-errors"
import type {
  DirectoryMaterialImportApplyInput,
  DirectoryMaterialImportApplyResponse,
  DirectoryMaterialImportJob,
} from "../types"

const DEFAULT_FAST_APPLY_BATCH_SIZE = 5000
const MAX_FAST_APPLY_BATCH_SIZE = 10000

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

type FastApplyRpcRow = {
  job: ImportJobDbRow | null
  applied_rows: number | string | null
  skipped_rows: number | string | null
  applied_material_ids: string[] | null
  has_more: boolean | null
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
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

export async function applyFastDirectoryMaterialImportBatchForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string,
  input: DirectoryMaterialImportApplyInput = {}
): Promise<DirectoryMaterialImportApplyResponse> {
  const requestedBatchSize = input.batchSize ?? DEFAULT_FAST_APPLY_BATCH_SIZE
  const batchSize = Math.max(
    DEFAULT_FAST_APPLY_BATCH_SIZE,
    Math.min(requestedBatchSize, MAX_FAST_APPLY_BATCH_SIZE)
  )

  const { data, error } = await supabase.rpc("apply_directory_material_import_batch", {
    p_workspace_owner_id: workspaceOwnerId,
    p_user_id: userId,
    p_job_id: id,
    p_limit: batchSize,
  })

  if (error) {
    await markImportJobFailed(workspaceOwnerId, id, error)
    throw error
  }

  const row = (Array.isArray(data) ? data[0] : data) as FastApplyRpcRow | null
  if (!row?.job) {
    throw new DirectoryMaterialsApiError(
      "BAD_REQUEST",
      "Быстрое применение импорта материалов не вернуло результат",
      400
    )
  }

  return {
    data: {
      job: mapJob(row.job),
      appliedRows: toNumber(row.applied_rows),
      skippedRows: toNumber(row.skipped_rows),
      appliedMaterialIds: row.applied_material_ids ?? [],
      hasMore: Boolean(row.has_more),
    },
  }
}
