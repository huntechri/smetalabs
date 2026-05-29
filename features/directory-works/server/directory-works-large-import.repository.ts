import { createHash } from "node:crypto"
import { supabase } from "@/db"
import { DirectoryWorksApiError } from "../api/directory-works-errors"
import type {
  DirectoryWorkImportApplyInput,
  DirectoryWorkImportApplyResponse,
  DirectoryWorkImportBatchInput,
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
const DEFAULT_PREVIEW_LIMIT = 100
const DEFAULT_APPLY_BATCH_SIZE = 200

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
  batch_number: number | null
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
  batchNumber: number
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
) {
  const title = toNullableString(getRawValue(rawData, ["title", "name"])) ?? ""
  const unit =
    toNullableString(
      getRawValue(rawData, ["unit", "unit_label", "unit_code"])
    ) ?? ""
  const category = toNullableString(getRawValue(rawData, ["category"])) ?? ""
  const rate = normalizeNumber(
    getRawValue(rawData, ["rate", "rate_amount", "price"])
  )
  const rawCurrency = toNullableString(
    getRawValue(rawData, ["currency_code", "currency"])
  )
  const rawPriceKind = toNullableString(
    getRawValue(rawData, ["price_kind", "priceKind"])
  ) as DirectoryWorkPriceKind | null
  const priceKind =
    rawPriceKind && VALID_PRICE_KINDS.has(rawPriceKind) ? rawPriceKind : "base"
  const rawVatRate = getRawValue(rawData, ["vat_rate", "vatRate"])
  const vatRate = rawVatRate === undefined ? null : normalizeNumber(rawVatRate)
  const errors: string[] = []
  const warnings: string[] = []

  if (!title) errors.push("Название обязательно")
  if (!unit) errors.push("Единица измерения обязательна")
  if (!category) errors.push("Категория обязательна")
  if (!Number.isFinite(rate) || rate < 0)
    errors.push("Расценка должна быть неотрицательным числом")
  if (rawPriceKind && !VALID_PRICE_KINDS.has(rawPriceKind))
    warnings.push("Неизвестный тип цены заменён на base")

  const currencyCode = rawCurrency ? rawCurrency.toUpperCase() : "RUB"
  if (!/^[A-Z]{3}$/.test(currencyCode))
    errors.push("Код валюты должен быть в ISO-формате")
  if (vatRate !== null && (!Number.isFinite(vatRate) || vatRate < 0))
    warnings.push("Некорректный НДС проигнорирован")

  return {
    data: {
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
        getRawValue(rawData, [
          "source_external_row_key",
          "sourceExternalRowKey",
        ])
      ),
      currencyCode,
      priceKind,
      aliases: splitList(getRawValue(rawData, ["aliases", "alias"])),
      keywords: splitList(getRawValue(rawData, ["keywords", "keyword"])),
      vatRate: vatRate !== null && Number.isFinite(vatRate) ? vatRate : null,
      effectiveDate: toNullableString(
        getRawValue(rawData, ["effective_date", "effectiveDate"])
      ),
    } satisfies DirectoryWorkImportNormalizedRow,
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
    fileSizeBytes:
      row.file_size_bytes === null ? null : Number(row.file_size_bytes),
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
    batchNumber: row.batch_number,
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
      acc.total_rows += 1
      acc.parsed_rows += 1
      if (row.status === "valid") acc.valid_rows += 1
      if (row.status === "warning") acc.warning_rows += 1
      if (row.status === "error") acc.error_rows += 1
      if (row.status === "duplicate") acc.duplicate_rows += 1
      if (row.status === "conflict") acc.conflict_rows += 1
      return acc
    },
    {
      total_rows: 0,
      parsed_rows: 0,
      valid_rows: 0,
      warning_rows: 0,
      error_rows: 0,
      duplicate_rows: 0,
      conflict_rows: 0,
    }
  )
}

async function getPreviewRows(
  workspaceOwnerId: string,
  jobId: string,
  limit = DEFAULT_PREVIEW_LIMIT
) {
  const { data, error } = await supabase
    .from("directory_work_import_rows")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", jobId)
    .order("row_number", { ascending: true })
    .limit(limit)

  if (error) throw error
  return ((data ?? []) as ImportRowDbRow[]).map(mapRow)
}

async function getJobRow(workspaceOwnerId: string, id: string) {
  const { data, error } = await supabase
    .from("directory_work_import_jobs")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as ImportJobDbRow | null
}

async function requirePreview(workspaceOwnerId: string, id: string) {
  const preview = await getChunkedDirectoryWorkImportJobForWorkspace(
    workspaceOwnerId,
    id
  )
  if (!preview)
    throw new DirectoryWorksApiError("NOT_FOUND", "Import job не найден", 404)
  return { data: preview }
}

async function getPriorFingerprints(workspaceOwnerId: string, jobId: string) {
  const { data, error } = await supabase
    .from("directory_work_import_rows")
    .select("dedupe_fingerprint")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", jobId)
    .not("dedupe_fingerprint", "is", null)

  if (error) throw error
  return new Set(
    ((data ?? []) as Array<{ dedupe_fingerprint: string | null }>)
      .map((row) => row.dedupe_fingerprint)
      .filter((value): value is string => Boolean(value))
  )
}

function prepareRows(
  input: DirectoryWorkImportBatchInput,
  fallbackSourceName: string | null,
  priorFingerprints: Set<string>
) {
  const seen = new Map<string, number>()

  return input.rows.map((rawData, index) => {
    const normalized = normalizeImportRow(rawData, fallbackSourceName)
    const dedupeFingerprint = buildDedupeFingerprint(normalized.data)
    let status: DirectoryWorkImportRowStatus =
      normalized.errors.length > 0 ? "error" : "valid"
    const warningMessages = [...normalized.warnings]

    if (
      status !== "error" &&
      (priorFingerprints.has(dedupeFingerprint) || seen.has(dedupeFingerprint))
    ) {
      status = "duplicate"
      warningMessages.push(
        seen.has(dedupeFingerprint)
          ? `Дубль строки ${seen.get(dedupeFingerprint)}`
          : "Дубль уже загруженной строки"
      )
    } else if (status !== "error") {
      seen.set(dedupeFingerprint, input.rowOffset + index + 1)
    }

    if (status === "valid" && warningMessages.length > 0) status = "warning"

    return {
      rowNumber: input.rowOffset + index + 1,
      batchNumber: input.batchNumber,
      rawData,
      normalizedData: normalized.data,
      status,
      action: status === "valid" || status === "warning" ? "create" : "skip",
      errorMessages: normalized.errors,
      warningMessages,
      dedupeFingerprint,
    } satisfies PreparedImportRow
  })
}

function toInsertRow(
  workspaceOwnerId: string,
  userId: string,
  row: DirectoryWorkImportNormalizedRow
) {
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

async function insertTerms(
  workspaceOwnerId: string,
  userId: string,
  workId: string,
  row: DirectoryWorkImportNormalizedRow
) {
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

export async function createChunkedDirectoryWorkImportJobForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  input: DirectoryWorkImportCreateInput
): Promise<DirectoryWorkImportPreviewResponse> {
  const fallbackSourceName = toNullableString(input.sourceName)
  const { data: jobRow, error } = await supabase
    .from("directory_work_import_jobs")
    .insert({
      workspace_owner_id: workspaceOwnerId,
      created_by: userId,
      status: "parsing",
      source_name: fallbackSourceName,
      file_name: toNullableString(input.fileName),
      file_mime_type: toNullableString(input.fileMimeType),
      file_size_bytes: input.fileSizeBytes ?? null,
      options: { ...(input.options ?? {}), importMode: "chunked" },
      summary: {
        supportedFormat: "csv",
        importMode: "chunked",
        previewLimit: DEFAULT_PREVIEW_LIMIT,
      },
    })
    .select("*")
    .single()

  if (error) throw error
  return { data: { job: mapJob(jobRow as ImportJobDbRow), rows: [] } }
}

export async function appendDirectoryWorkImportBatchForWorkspace(
  workspaceOwnerId: string,
  id: string,
  input: DirectoryWorkImportBatchInput
): Promise<DirectoryWorkImportPreviewResponse> {
  const jobRow = await getJobRow(workspaceOwnerId, id)
  if (!jobRow)
    throw new DirectoryWorksApiError("NOT_FOUND", "Import job не найден", 404)
  if (
    ![
      "draft",
      "uploaded",
      "parsing",
      "parsed",
      "validating",
      "validated",
      "ready_for_review",
    ].includes(jobRow.status)
  ) {
    throw new DirectoryWorksApiError(
      "BAD_REQUEST",
      "В этот импорт нельзя добавить строки",
      400
    )
  }

  const { count, error: countError } = await supabase
    .from("directory_work_import_rows")
    .select("id", { count: "exact", head: true })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", id)
    .eq("batch_number", input.batchNumber)

  if (countError) throw countError
  if ((count ?? 0) > 0) return requirePreview(workspaceOwnerId, id)

  if (input.rows.length === 0) {
    if (input.isLastBatch) {
      const { error } = await supabase
        .from("directory_work_import_jobs")
        .update({ status: "ready_for_review", last_error: null })
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("id", id)
      if (error) throw error
    }
    return requirePreview(workspaceOwnerId, id)
  }

  const rows = prepareRows(
    input,
    jobRow.source_name,
    await getPriorFingerprints(workspaceOwnerId, id)
  )
  const counts = getCounts(rows)

  const { error: rowsError } = await supabase
    .from("directory_work_import_rows")
    .insert(
      rows.map((row) => ({
        workspace_owner_id: workspaceOwnerId,
        job_id: id,
        row_number: row.rowNumber,
        batch_number: row.batchNumber,
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

  const { error: updateError } = await supabase
    .from("directory_work_import_jobs")
    .update({
      status: input.isLastBatch ? "ready_for_review" : "parsing",
      total_rows: toNumber(jobRow.total_rows) + counts.total_rows,
      parsed_rows: toNumber(jobRow.parsed_rows) + counts.parsed_rows,
      valid_rows: toNumber(jobRow.valid_rows) + counts.valid_rows,
      warning_rows: toNumber(jobRow.warning_rows) + counts.warning_rows,
      error_rows: toNumber(jobRow.error_rows) + counts.error_rows,
      duplicate_rows: toNumber(jobRow.duplicate_rows) + counts.duplicate_rows,
      conflict_rows: toNumber(jobRow.conflict_rows) + counts.conflict_rows,
      last_error: null,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)

  if (updateError) throw updateError
  return requirePreview(workspaceOwnerId, id)
}

export async function getChunkedDirectoryWorkImportJobForWorkspace(
  workspaceOwnerId: string,
  id: string
): Promise<DirectoryWorkImportPreviewResponse["data"] | null> {
  const jobRow = await getJobRow(workspaceOwnerId, id)
  if (!jobRow) return null
  return {
    job: mapJob(jobRow),
    rows: await getPreviewRows(workspaceOwnerId, id),
  }
}

export async function applyDirectoryWorkImportBatchForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string,
  input: DirectoryWorkImportApplyInput = {}
): Promise<DirectoryWorkImportApplyResponse> {
  const jobRow = await getJobRow(workspaceOwnerId, id)
  if (!jobRow)
    throw new DirectoryWorksApiError("NOT_FOUND", "Import job не найден", 404)
  if (!["ready_for_review", "applying"].includes(jobRow.status)) {
    throw new DirectoryWorksApiError(
      "BAD_REQUEST",
      "Импорт можно применять только после загрузки всех пакетов",
      400
    )
  }

  const batchSize = Math.max(
    1,
    Math.min(input.batchSize ?? DEFAULT_APPLY_BATCH_SIZE, 500)
  )
  await supabase
    .from("directory_work_import_jobs")
    .update({
      status: "applying",
      started_at: jobRow.started_at ?? new Date().toISOString(),
      last_error: null,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)

  const { data, error } = await supabase
    .from("directory_work_import_rows")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", id)
    .eq("action", "create")
    .in("status", ["valid", "warning"])
    .is("applied_at", null)
    .order("row_number", { ascending: true })
    .limit(batchSize + 1)

  if (error) throw error

  const fetchedRows = ((data ?? []) as ImportRowDbRow[]).map(mapRow)
  const rowsToApply = fetchedRows.slice(0, batchSize)
  const hasMore = fetchedRows.length > batchSize

  if (rowsToApply.length === 0) {
    const skippedRows = Math.max(
      0,
      toNumber(jobRow.total_rows) - toNumber(jobRow.applied_rows)
    )
    const { data: completedJob, error: updateError } = await supabase
      .from("directory_work_import_jobs")
      .update({
        status: "completed",
        skipped_rows: skippedRows,
        completed_at: new Date().toISOString(),
      })
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) throw updateError
    return {
      data: {
        job: mapJob(completedJob as ImportJobDbRow),
        appliedRows: 0,
        skippedRows,
        appliedWorkIds: [],
        hasMore: false,
      },
    }
  }

  try {
    const normalizedRows = rowsToApply.map(
      (row) => row.normalizedData as DirectoryWorkImportNormalizedRow
    )
    const { data: inserted, error: insertError } = await supabase
      .from("directory_works")
      .insert(
        normalizedRows.map((row) => toInsertRow(workspaceOwnerId, userId, row))
      )
      .select("id")

    if (insertError) throw insertError

    const workIds = ((inserted ?? []) as Array<{ id: string }>).map(
      (work) => work.id
    )
    await Promise.all(
      normalizedRows.map((row, index) =>
        insertTerms(workspaceOwnerId, userId, workIds[index], row)
      )
    )
    await Promise.all(
      rowsToApply.map((row, index) =>
        supabase
          .from("directory_work_import_rows")
          .update({
            status: "applied",
            applied_work_id: workIds[index],
            applied_at: new Date().toISOString(),
          })
          .eq("workspace_owner_id", workspaceOwnerId)
          .eq("id", row.id)
      )
    )

    const nextAppliedRows = toNumber(jobRow.applied_rows) + rowsToApply.length
    const completed = !hasMore
    const skippedRows = completed
      ? Math.max(0, toNumber(jobRow.total_rows) - nextAppliedRows)
      : toNumber(jobRow.skipped_rows)
    const { data: updatedJob, error: updateError } = await supabase
      .from("directory_work_import_jobs")
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
        appliedWorkIds: workIds,
        hasMore,
      },
    }
  } catch (err) {
    await supabase
      .from("directory_work_import_jobs")
      .update({
        status: "failed",
        last_error:
          err instanceof Error
            ? err.message
            : "Не удалось применить пакет импорта",
        completed_at: new Date().toISOString(),
      })
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("id", id)
    throw err
  }
}
