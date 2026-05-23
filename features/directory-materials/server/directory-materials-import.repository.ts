import { createHash } from "node:crypto"
import { supabase } from "@/db"
import { DirectoryMaterialsApiError } from "../api/directory-materials-errors"
import type {
  DirectoryMaterialImportApplyResponse,
  DirectoryMaterialImportCreateInput,
  DirectoryMaterialImportJob,
  DirectoryMaterialImportNormalizedRow,
  DirectoryMaterialImportPreviewResponse,
  DirectoryMaterialImportRow,
  DirectoryMaterialImportRowAction,
  DirectoryMaterialImportRowStatus,
} from "../types"

const APPLY_CHUNK_SIZE = 100

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
  raw_data: Record<string, unknown> | null
  normalized_data: Record<string, unknown> | null
  status: DirectoryMaterialImportRowStatus
  action: DirectoryMaterialImportRowAction | null
  error_messages: string[] | null
  warning_messages: string[] | null
  duplicate_material_id: string | null
  conflict_material_ids: string[] | null
  dedupe_fingerprint: string | null
  applied_material_id: string | null
  applied_at: string | null
  created_at: string
  updated_at: string
}

type PreparedImportRow = {
  rowNumber: number
  rawData: Record<string, unknown>
  normalizedData: DirectoryMaterialImportNormalizedRow
  status: DirectoryMaterialImportRowStatus
  action: DirectoryMaterialImportRowAction
  errorMessages: string[]
  warningMessages: string[]
  duplicateMaterialId: string | null
  conflictMaterialIds: string[]
  dedupeFingerprint: string
}

type ExistingMaterialCandidate = {
  id: string
  code: string | null
  normalized_name: string
  unit_code: string
  source_name: string | null
  source_external_row_key: string | null
  dedupe_fingerprint: string
}

type SupabaseWriteError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function isSupabaseWriteError(error: unknown): error is SupabaseWriteError {
  return Boolean(
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  )
}

function throwImportCreateError(error: unknown): never {
  if (isSupabaseWriteError(error)) {
    console.error("[directory-materials.import.create]", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })

    throw new DirectoryMaterialsApiError(
      "BAD_REQUEST",
      error.message ||
        "Не удалось создать импорт материалов. Проверьте файл и попробуйте снова.",
      400
    )
  }

  throw error
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

function getRawValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== "") return value
  }
  return undefined
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeUnitCode(unit: string) {
  return normalizeSearch(unit).replace(/\s+/g, "_")
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value !== "string") return Number.NaN
  return Number(value.trim().replace(/\s+/g, "").replace(",", "."))
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function buildDedupeFingerprint(input: DirectoryMaterialImportNormalizedRow) {
  return createHash("md5")
    .update(
      [
        normalizeText(input.name),
        normalizeText(normalizeUnitCode(input.unit)),
        normalizeText(input.category),
        normalizeText(input.subcategory),
        normalizeText(input.code),
        normalizeText(input.supplierName),
        normalizeText(input.sourceName),
        normalizeText(input.sourceExternalRowKey),
      ].join("|")
    )
    .digest("hex")
}

function normalizeImportRow(
  rawData: Record<string, unknown>,
  fallbackSourceName: string | null
): DirectoryMaterialImportNormalizedRow & {
  errors: string[]
  warnings: string[]
} {
  const name =
    toNullableString(
      getRawValue(rawData, ["name", "title", "наименование", "название"])
    ) ?? ""
  const unit =
    toNullableString(
      getRawValue(rawData, [
        "unit",
        "unit_label",
        "unit_code",
        "единица",
        "ед. изм.",
      ])
    ) ?? ""
  const category =
    toNullableString(getRawValue(rawData, ["category", "категория"])) ?? ""
  const rawPrice = getRawValue(rawData, [
    "price",
    "price_amount",
    "rate",
    "цена",
  ])
  const price = normalizeNumber(rawPrice)
  const rawCurrency = toNullableString(
    getRawValue(rawData, [
      "currency_code",
      "currencyCode",
      "currency",
      "валюта",
    ])
  )
  const currencyCode = rawCurrency ? rawCurrency.toUpperCase() : "RUB"
  const errors: string[] = []
  const warnings: string[] = []

  if (!name) errors.push("Название материала обязательно")
  if (!unit) errors.push("Единица измерения обязательна")
  if (!category) errors.push("Категория обязательна")
  if (!Number.isFinite(price) || price < 0) {
    errors.push("Цена должна быть неотрицательным числом")
  }
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    errors.push("Код валюты должен быть в ISO-формате")
  }

  return {
    name,
    unit,
    price: Number.isFinite(price) ? price : 0,
    category,
    subcategory: toNullableString(
      getRawValue(rawData, ["subcategory", "подкатегория"])
    ),
    code: toNullableString(getRawValue(rawData, ["code", "код"])),
    supplierName: toNullableString(
      getRawValue(rawData, [
        "supplierName",
        "supplier_name",
        "supplier",
        "поставщик",
      ])
    ),
    imageUrl: toNullableString(
      getRawValue(rawData, ["imageUrl", "image_url", "ссылка на изображение"])
    ),
    description: toNullableString(
      getRawValue(rawData, ["description", "описание"])
    ),
    aliases: splitList(getRawValue(rawData, ["aliases", "alias", "синонимы"])),
    keywords: splitList(
      getRawValue(rawData, ["keywords", "keyword", "ключевые слова"])
    ),
    sourceName:
      toNullableString(
        getRawValue(rawData, ["sourceName", "source_name", "источник"])
      ) ?? fallbackSourceName,
    sourceExternalRowKey: toNullableString(
      getRawValue(rawData, [
        "sourceExternalRowKey",
        "source_external_row_key",
        "external_id",
      ])
    ),
    currencyCode,
    errors,
    warnings,
  }
}

function mapJob(row: ImportJobDbRow): DirectoryMaterialImportJob {
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

function mapRow(row: ImportRowDbRow): DirectoryMaterialImportRow {
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
    duplicateMaterialId: row.duplicate_material_id,
    conflictMaterialIds: row.conflict_material_ids ?? [],
    dedupeFingerprint: row.dedupe_fingerprint,
    appliedMaterialId: row.applied_material_id,
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

async function getRows(workspaceOwnerId: string, jobId: string) {
  const { data, error } = await supabase
    .from("directory_material_import_rows")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", jobId)
    .order("row_number", { ascending: true })

  if (error) throw error
  return ((data ?? []) as ImportRowDbRow[]).map(mapRow)
}

async function loadExistingCandidates(workspaceOwnerId: string) {
  const { data, error } = await supabase
    .from("directory_materials")
    .select(
      "id,code,normalized_name,unit_code,source_name,source_external_row_key,dedupe_fingerprint"
    )
    .eq("workspace_owner_id", workspaceOwnerId)
    .is("deleted_at", null)

  if (error) throw error
  return (data ?? []) as ExistingMaterialCandidate[]
}

function classifyAgainstExisting(
  row: PreparedImportRow,
  existing: ExistingMaterialCandidate[]
): PreparedImportRow {
  if (row.status === "error") return row

  const normalized = row.normalizedData
  const normalizedName = normalizeSearch(normalized.name)
  const unitCode = normalizeUnitCode(normalized.unit)
  const code = normalized.code?.trim() || null
  const sourceName = normalized.sourceName?.trim() || null
  const sourceExternalRowKey = normalized.sourceExternalRowKey?.trim() || null

  const exactDuplicate = existing.find((candidate) => {
    if (code && candidate.code === code) return true
    if (
      sourceName &&
      sourceExternalRowKey &&
      candidate.source_name === sourceName &&
      candidate.source_external_row_key === sourceExternalRowKey
    ) {
      return true
    }
    return candidate.dedupe_fingerprint === row.dedupeFingerprint
  })

  if (exactDuplicate) {
    return {
      ...row,
      status: "duplicate",
      action: "skip",
      duplicateMaterialId: exactDuplicate.id,
      warningMessages: [
        ...row.warningMessages,
        "Такой материал уже есть в справочнике",
      ],
    }
  }

  const conflicts = existing
    .filter(
      (candidate) =>
        candidate.normalized_name === normalizedName &&
        candidate.unit_code === unitCode
    )
    .map((candidate) => candidate.id)

  if (conflicts.length > 0) {
    return {
      ...row,
      status: "conflict",
      action: "skip",
      conflictMaterialIds: conflicts,
      warningMessages: [
        ...row.warningMessages,
        "Найден материал с таким названием и единицей измерения",
      ],
    }
  }

  return row
}

export async function getDirectoryMaterialImportJobForWorkspace(
  workspaceOwnerId: string,
  id: string
): Promise<DirectoryMaterialImportPreviewResponse["data"] | null> {
  const { data, error } = await supabase
    .from("directory_material_import_jobs")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return {
    job: mapJob(data as ImportJobDbRow),
    rows: await getRows(workspaceOwnerId, id),
  }
}

export async function createDirectoryMaterialImportJobForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  input: DirectoryMaterialImportCreateInput
): Promise<DirectoryMaterialImportPreviewResponse> {
  const fallbackSourceName = toNullableString(input.sourceName)
  const seen = new Map<string, number>()
  const existing = await loadExistingCandidates(workspaceOwnerId)
  const rows: PreparedImportRow[] = input.rows.map((rawData, index) => {
    const normalized = normalizeImportRow(rawData, fallbackSourceName)
    const { errors, warnings, ...normalizedData } = normalized
    const dedupeFingerprint = buildDedupeFingerprint(normalizedData)
    let status: DirectoryMaterialImportRowStatus =
      errors.length > 0 ? "error" : "valid"

    if (status !== "error" && seen.has(dedupeFingerprint)) {
      status = "duplicate"
      warnings.push(`Дубль строки ${seen.get(dedupeFingerprint)}`)
    } else if (status !== "error") {
      seen.set(dedupeFingerprint, index + 1)
    }

    if (status === "valid" && warnings.length > 0) status = "warning"

    const action: DirectoryMaterialImportRowAction =
      status === "valid" || status === "warning" ? "create" : "skip"

    return classifyAgainstExisting(
      {
        rowNumber: index + 1,
        rawData,
        normalizedData,
        status,
        action,
        errorMessages: errors,
        warningMessages: warnings,
        duplicateMaterialId: null,
        conflictMaterialIds: [],
        dedupeFingerprint,
      },
      existing
    )
  })
  const counts = getCounts(rows)
  const { data: jobRow, error: jobError } = await supabase
    .from("directory_material_import_jobs")
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
      ...counts,
    })
    .select("*")
    .single()

  if (jobError) throwImportCreateError(jobError)

  const { error: rowsError } = await supabase
    .from("directory_material_import_rows")
    .insert(
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
        duplicate_material_id: row.duplicateMaterialId,
        conflict_material_ids: row.conflictMaterialIds,
        dedupe_fingerprint: row.dedupeFingerprint,
      }))
    )
  if (rowsError) throwImportCreateError(rowsError)

  return {
    data: {
      job: mapJob(jobRow as ImportJobDbRow),
      rows: await getRows(workspaceOwnerId, jobRow.id),
    },
  }
}

function toInsertRow(
  workspaceOwnerId: string,
  userId: string,
  row: DirectoryMaterialImportNormalizedRow
) {
  const unit = row.unit.trim().replace(/\s+/g, " ")
  return {
    workspace_owner_id: workspaceOwnerId,
    name: row.name.trim().replace(/\s+/g, " "),
    normalized_name: "pending",
    unit_code: normalizeUnitCode(unit),
    unit_label: unit,
    price_amount: row.price,
    currency_code: row.currencyCode ?? "RUB",
    category: row.category.trim().replace(/\s+/g, " "),
    subcategory: toNullableString(row.subcategory),
    code: toNullableString(row.code),
    supplier_name: toNullableString(row.supplierName),
    supplier_id: null,
    image_url: toNullableString(row.imageUrl),
    description: toNullableString(row.description),
    aliases: row.aliases ?? [],
    keywords: row.keywords ?? [],
    source_name: toNullableString(row.sourceName),
    source_external_row_key: toNullableString(row.sourceExternalRowKey),
    dedupe_fingerprint: "pending",
    search_text: "pending",
    search_fts: "",
    created_by: userId,
    updated_by: userId,
    status: "active",
    version: 1,
  }
}

export async function applyDirectoryMaterialImportJobForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string
): Promise<DirectoryMaterialImportApplyResponse> {
  const current = await getDirectoryMaterialImportJobForWorkspace(
    workspaceOwnerId,
    id
  )
  if (!current)
    throw new DirectoryMaterialsApiError(
      "NOT_FOUND",
      "Import job материалов не найден",
      404
    )
  if (current.job.status !== "ready_for_review") {
    throw new DirectoryMaterialsApiError(
      "BAD_REQUEST",
      "Импорт материалов можно применить только из статуса ready_for_review",
      400
    )
  }

  const rows = current.rows.filter(
    (row) =>
      row.action === "create" &&
      (row.status === "valid" || row.status === "warning")
  )
  const skippedRows = current.rows.length - rows.length
  await supabase
    .from("directory_material_import_jobs")
    .update({
      status: "applying",
      started_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)

  let appliedRows = 0
  const appliedMaterialIds: string[] = []

  try {
    for (let index = 0; index < rows.length; index += APPLY_CHUNK_SIZE) {
      const chunk = rows.slice(index, index + APPLY_CHUNK_SIZE)
      const normalizedRows = chunk.map(
        (row) => row.normalizedData as DirectoryMaterialImportNormalizedRow
      )
      const { data, error } = await supabase
        .from("directory_materials")
        .insert(
          normalizedRows.map((row) =>
            toInsertRow(workspaceOwnerId, userId, row)
          )
        )
        .select("id")
      if (error) throw error

      const materialIds = ((data ?? []) as Array<{ id: string }>).map(
        (material) => material.id
      )
      appliedMaterialIds.push(...materialIds)
      await Promise.all(
        chunk.map((row, rowIndex) =>
          supabase
            .from("directory_material_import_rows")
            .update({
              status: "applied",
              applied_material_id: materialIds[rowIndex],
              applied_at: new Date().toISOString(),
            })
            .eq("workspace_owner_id", workspaceOwnerId)
            .eq("id", row.id)
        )
      )
      appliedRows += chunk.length
    }

    const { data: updatedJob, error } = await supabase
      .from("directory_material_import_jobs")
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

    return {
      data: {
        job: mapJob(updatedJob as ImportJobDbRow),
        appliedRows,
        skippedRows,
        appliedMaterialIds,
      },
    }
  } catch (err) {
    await supabase
      .from("directory_material_import_jobs")
      .update({
        status: "failed",
        last_error:
          err instanceof Error
            ? err.message
            : "Не удалось применить импорт материалов",
        completed_at: new Date().toISOString(),
      })
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("id", id)
    throw err
  }
}
