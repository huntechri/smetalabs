import { createHash } from "node:crypto"
import { supabase } from "@/db"
import { DirectoryWorksApiError } from "../api/directory-works-errors"
import type {
  DirectoryWorkImportApplyResponse,
  DirectoryWorkImportCreateInput,
  DirectoryWorkImportJob,
  DirectoryWorkImportNormalizedRow,
  DirectoryWorkImportPreviewResponse,
  DirectoryWorkImportRow,
  DirectoryWorkImportRowAction,
  DirectoryWorkImportRowStatus,
  DirectoryWorkPriceKind,
} from "../types"

const VALID_PRICE_KINDS = new Set<DirectoryWorkPriceKind>([
  "base",
  "labor",
  "turnkey",
  "estimate",
  "custom",
])

const APPLY_CHUNK_SIZE = 100

type ImportJobDbRow = {
  id: string
  status: DirectoryWorkImportJob["status"]
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
  raw_data: Record<string, unknown> | null
  normalized_data: Record<string, unknown> | null
  status: DirectoryWorkImportRowStatus
  action: DirectoryWorkImportRowAction | null
  error_messages: string[] | null
  warning_messages: string[] | null
  duplicate_work_id: string | null
  conflict_work_ids: string[] | null
  dedupe_fingerprint: string | null
  applied_work_id: string | null
  applied_at: string | null
  created_at: string
  updated_at: string
}

type PreparedImportRow = {
  rowNumber: number
  rawData: Record<string, unknown>
  normalizedData: DirectoryWorkImportNormalizedRow
  status: DirectoryWorkImportRowStatus
  action: DirectoryWorkImportRowAction
  errorMessages: string[]
  warningMessages: string[]
  dedupeFingerprint: string
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNullableString(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null
  const trimmed = String(value).trim().replace(/\s+/g, " ")
  return trimmed.length > 0 ? trimmed : null
}

function getRawValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== "") return value
  }
  return undefined
}

function normalizeUnitCode(unit: string) {
  return unit.trim().toLowerCase().replace(/\s+/g, "_")
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value !== "string") return Number.NaN
  return Number(value.trim().replace(/\s+/g, "").replace(",", "."))
}

function splitList(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => toNullableString(item)).filter(Boolean))
    ) as string[]
  }

  const stringValue = toNullableString(value)
  if (!stringValue) return []

  return Array.from(
    new Set(
      stringValue
        .split(/[;,|]/g)
        .map((item) => item.trim().replace(/\s+/g, " "))
        .filter(Boolean)
    )
  )
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function buildDedupeFingerprint(input: DirectoryWorkImportNormalizedRow) {
  return createHash("md5")
    .update(
      [
        normalizeText(input.title),
        normalizeText(normalizeUnitCode(input.unit)),
        normalizeText(input.category),
        normalizeText(input.subcategory),
        normalizeText(input.code),
        normalizeText(input.sourceName),
        normalizeText(input.sourceExternalRowKey),
      ].join("|")
    )
    .digest("hex")
}

function normalizeImportRow(
  rawData: Record<string, unknown>,
  fallbackSourceName: string | null
): PreparedImportRow["normalizedData"] & { errors: string[]; warnings: string[] } {
  const title = toNullableString(getRawValue(rawData, ["title", "name"])) ?? ""
  const unit =
    toNullableString(getRawValue(rawData, ["unit", "unit_label", "unit_code"])) ?? ""
  const category = toNullableString(getRawValue(rawData, ["category"])) ?? ""
  const rawRate = getRawValue(rawData, ["rate", "rate_amount", "price"])
  const rate = normalizeNumber(rawRate)
  const rawCurrency = toNullableString(
    getRawValue(rawData, ["currency_code", "currency"])
  )
  const rawPriceKind = toNullableString(
    getRawValue(rawData, ["price_kind", "priceKind"])
  ) as DirectoryWorkPriceKind | null
  const priceKind = rawPriceKind && VALID_PRICE_KINDS.has(rawPriceKind) ? rawPriceKind : "base"
  const rawVatRate = getRawValue(rawData, ["vat_rate", "vatRate"])
  const vatRate = rawVatRate === undefined ? null : normalizeNumber(rawVatRate)
  const errors: string[] = []
  const warnings: string[] = []

  if (!title) errors.push("Название обязательно")
  if (!unit) errors.push("Единица измерения обязательна")
  if (!category) errors.push("Категория обязательна")
  if (!Number.isFinite(rate) || rate < 0) {
    errors.push("Расценка должна быть неотрицательным числом")
  }
  if (rawPriceKind && !VALID_PRICE_KINDS.has(rawPriceKind)) {
    warnings.push("Неизвестный тип цены заменён на base")
  }

  const currencyCode = rawCurrency ? rawCurrency.toUpperCase() : "RUB"
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    errors.push("Код валюты должен быть в ISO-формате")
  }
  if (vatRate !== null && (!Number.isFinite(vatRate) || vatRate < 0)) {
    warnings.push("Некорректный НДС проигнорирован")
  }

  return {
    title,
    unit,
    rate: Number.isFinite(rate) ? rate : 0,
    category,
    subcategory: toNullableString(getRawValue(rawData, ["subcategory"])),
    code: toNullableString(getRawValue(rawData, ["code"])),
    description: toNullableString(getRawValue(rawData, ["description"])),
    includedOperations: toNullableString(
      getRawValue(rawData, ["included_operations", "includedOperations"])
    ),
    excludedOperations: toNullableString(
      getRawValue(rawData, ["excluded_operations", "excludedOperations"])
    ),
    sourceName:
      toNullableString(getRawValue(rawData, ["source_name", "sourceName"])) ??
      fallbackSourceName,
    sourceExternalRowKey: toNullableString(
      getRawValue(rawData, ["source_external_row_key", "sourceExternalRowKey"])
    ),
    currencyCode,
    priceKind,
    aliases: splitList(getRawValue(rawData, ["aliases", "alias"])),
    keywords: splitList(getRawValue(rawData, ["keywords", "keyword"])),
    vatRate: vatRate !== null && Number.isFinite(vatRate) ? vatRate : null,
    effectiveDate: toNullableString(
      getRawValue(rawData, ["effective_date", "effectiveDate"])
    ),
    errors,
    warnings,
  }
}

function mapJob(row: ImportJobDbRow): DirectoryWorkImportJob {
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

function mapRow(row: ImportRowDbRow): DirectoryWorkImportRow {
  return {
    id: row.id,
    jobId: row.job_id,
    rowNumber: row.row_number,
    rawData: row.raw_data ?? {},
    normalizedData: row.normalized_data ?? {},
    status: row.status,
    action: row.action,
    errorMessages: row.error_messages ?? [],
    warningMessages: row.warning_messages ?? [],
    duplicateWorkId: row.duplicate_work_id,
    conflictWorkIds: row.conflict_work_ids ?? [],
    dedupeFingerprint: row.dedupe_fingerprint,
    appliedWorkId: row.applied_work_id,
    appliedAt: row.applied_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getCounts(rows: PreparedImportRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.totalRows += 1
      acc.parsedRows += 1
      if (row.status === "valid") acc.validRows += 1
      if (row.status === "warning") acc.warningRows += 1
      if (row.status === "error") acc.errorRows += 1
      return acc
    },
    { totalRows: 0, parsedRows: 0, validRows: 0, warningRows: 0, errorRows: 0 }
  )
}

async function getRows(workspaceOwnerId: string, jobId: string) {
  const { data, error } = await supabase
    .from("directory_work_import_rows")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", jobId)
    .order("row_number", { ascending: true })

  if (error) throw error
  return ((data ?? []) as ImportRowDbRow[]).map(mapRow)
}

export async function getDirectoryWorkImportJobForWorkspace(
  workspaceOwnerId: string,
  id: string
): Promise<DirectoryWorkImportPreviewResponse["data"] | null> {
  const { data, error } = await supabase
    .from("directory_work_import_jobs")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return { job: mapJob(data as ImportJobDbRow), rows: await getRows(workspaceOwnerId, id) }
}

export async function createDirectoryWorkImportJobForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  input: DirectoryWorkImportCreateInput
): Promise<DirectoryWorkImportPreviewResponse> {
  const fallbackSourceName = toNullableString(input.sourceName)
  const seen = new Map<string, number>()
  const rows: PreparedImportRow[] = input.rows.map((rawData, index) => {
    const normalized = normalizeImportRow(rawData, fallbackSourceName)
    const { errors, warnings, ...normalizedData } = normalized
    const dedupeFingerprint = buildDedupeFingerprint(normalizedData)
    let status: DirectoryWorkImportRowStatus = errors.length > 0 ? "error" : "valid"

    if (status !== "error" && seen.has(dedupeFingerprint)) {
      status = "duplicate"
      warnings.push(`Дубль строки ${seen.get(dedupeFingerprint)}`)
    } else if (status !== "error") {
      seen.set(dedupeFingerprint, index + 1)
    }

    if (status === "valid" && warnings.length > 0) status = "warning"

    const action: DirectoryWorkImportRowAction =
      status === "valid" || status === "warning" ? "create" : "skip"

    return {
      rowNumber: index + 1,
      rawData,
      normalizedData,
      status,
      action,
      errorMessages: errors,
      warningMessages: warnings,
      dedupeFingerprint,
    }
  })
  const counts = getCounts(rows)
  const duplicateRows = rows.filter((row) => row.status === "duplicate").length
  const { data: jobRow, error: jobError } = await supabase
    .from("directory_work_import_jobs")
    .insert({
      workspace_owner_id: workspaceOwnerId,
      created_by: userId,
      status: "ready_for_review",
      source_name: fallbackSourceName,
      file_name: toNullableString(input.fileName),
      file_mime_type: toNullableString(input.fileMimeType),
      file_size_bytes: input.fileSizeBytes ?? null,
      options: input.options ?? {},
      summary: { supportedFormat: "csv", maxRows: 1000 },
      duplicate_rows: duplicateRows,
      conflict_rows: 0,
      ...counts,
    })
    .select("*")
    .single()

  if (jobError) throw jobError

  const { error: rowsError } = await supabase.from("directory_work_import_rows").insert(
    rows.map((row) => ({
      workspace_owner_id: workspaceOwnerId,
      job_id: jobRow.id,
      row_number: row.rowNumber,
      raw_data: row.rawData,
      normalized_data: row.normalizedData,
      status: row.status,
      action: row.action,
      error_messages: row.errorMessages,
      warning_messages: row.warningMessages,
      dedupe_fingerprint: row.dedupeFingerprint,
    }))
  )
  if (rowsError) throw rowsError

  return {
    data: {
      job: mapJob(jobRow as ImportJobDbRow),
      rows: await getRows(workspaceOwnerId, jobRow.id),
    },
  }
}

function toInsertRow(workspaceOwnerId: string, userId: string, row: DirectoryWorkImportNormalizedRow) {
  const unit = row.unit.trim().replace(/\s+/g, " ")
  return {
    workspace_owner_id: workspaceOwnerId,
    title: row.title.trim().replace(/\s+/g, " "),
    unit_code: normalizeUnitCode(unit),
    unit_label: unit,
    rate_amount: row.rate,
    category: row.category.trim().replace(/\s+/g, " "),
    subcategory: toNullableString(row.subcategory),
    code: toNullableString(row.code),
    description: toNullableString(row.description),
    included_operations: toNullableString(row.includedOperations),
    excluded_operations: toNullableString(row.excludedOperations),
    source_name: toNullableString(row.sourceName),
    source_external_row_key: toNullableString(row.sourceExternalRowKey),
    currency_code: row.currencyCode ?? "RUB",
    price_kind: row.priceKind ?? "base",
    created_by: userId,
    updated_by: userId,
    status: "active",
  }
}

async function insertTerms(workspaceOwnerId: string, userId: string, workId: string, row: DirectoryWorkImportNormalizedRow) {
  if (row.aliases.length > 0) {
    const { error } = await supabase.from("work_aliases").insert(
      row.aliases.map((alias) => ({
        workspace_owner_id: workspaceOwnerId,
        work_id: workId,
        alias,
        source: "import",
        weight: 1,
        created_by: userId,
      }))
    )
    if (error) throw error
  }

  if (row.keywords.length > 0) {
    const { error } = await supabase.from("work_keywords").insert(
      row.keywords.map((keyword) => ({
        workspace_owner_id: workspaceOwnerId,
        work_id: workId,
        keyword,
        source: "import",
        weight: 1,
        created_by: userId,
      }))
    )
    if (error) throw error
  }
}

export async function applyDirectoryWorkImportJobForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string
): Promise<DirectoryWorkImportApplyResponse> {
  const current = await getDirectoryWorkImportJobForWorkspace(workspaceOwnerId, id)
  if (!current) throw new DirectoryWorksApiError("NOT_FOUND", "Import job не найден", 404)
  if (current.job.status !== "ready_for_review") {
    throw new DirectoryWorksApiError(
      "BAD_REQUEST",
      "Импорт можно применить только из статуса ready_for_review",
      400
    )
  }

  const rows = current.rows.filter(
    (row) => row.action === "create" && (row.status === "valid" || row.status === "warning")
  )
  const skippedRows = current.rows.length - rows.length
  await supabase
    .from("directory_work_import_jobs")
    .update({ status: "applying", started_at: new Date().toISOString(), last_error: null })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)

  let appliedRows = 0

  try {
    for (let index = 0; index < rows.length; index += APPLY_CHUNK_SIZE) {
      const chunk = rows.slice(index, index + APPLY_CHUNK_SIZE)
      const normalizedRows = chunk.map((row) => row.normalizedData as DirectoryWorkImportNormalizedRow)
      const { data, error } = await supabase
        .from("directory_works")
        .insert(normalizedRows.map((row) => toInsertRow(workspaceOwnerId, userId, row)))
        .select("id")
      if (error) throw error

      const workIds = ((data ?? []) as Array<{ id: string }>).map((work) => work.id)
      await Promise.all(
        normalizedRows.map((row, rowIndex) =>
          insertTerms(workspaceOwnerId, userId, workIds[rowIndex], row)
        )
      )
      await Promise.all(
        chunk.map((row, rowIndex) =>
          supabase
            .from("directory_work_import_rows")
            .update({
              status: "applied",
              applied_work_id: workIds[rowIndex],
              applied_at: new Date().toISOString(),
            })
            .eq("workspace_owner_id", workspaceOwnerId)
            .eq("id", row.id)
        )
      )
      appliedRows += chunk.length
    }

    const { data: updatedJob, error } = await supabase
      .from("directory_work_import_jobs")
      .update({
        status: "completed",
        applied_rows: appliedRows,
        skipped_rows: skippedRows,
        completed_at: new Date().toISOString(),
      })
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error

    return { data: { job: mapJob(updatedJob as ImportJobDbRow), appliedRows, skippedRows } }
  } catch (err) {
    await supabase
      .from("directory_work_import_jobs")
      .update({
        status: "failed",
        last_error: err instanceof Error ? err.message : "Не удалось применить импорт",
        completed_at: new Date().toISOString(),
      })
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("id", id)
    throw err
  }
}
