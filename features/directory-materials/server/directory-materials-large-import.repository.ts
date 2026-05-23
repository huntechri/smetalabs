import { createHash } from "node:crypto"
import { supabase } from "@/db"
import { DirectoryMaterialsApiError } from "../api/directory-materials-errors"
import type {
  DirectoryMaterialImportApplyInput,
  DirectoryMaterialImportApplyResponse,
  DirectoryMaterialImportBatchInput,
  DirectoryMaterialImportCreateInput,
  DirectoryMaterialImportJob,
  DirectoryMaterialImportNormalizedRow,
  DirectoryMaterialImportPreviewResponse,
  DirectoryMaterialImportRow,
  DirectoryMaterialImportRowAction,
  DirectoryMaterialImportRowStatus,
} from "../types"

const DEFAULT_PREVIEW_LIMIT = 100
const DEFAULT_APPLY_BATCH_SIZE = 500

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
  batch_number: number | null
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

type PreparedRow = {
  rowNumber: number
  batchNumber: number
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

type ExistingMaterial = {
  id: string
  name: string | null
  code: string | null
  normalized_name: string | null
  unit_code: string | null
  price_amount: string | number | null
  currency_code: string | null
  source_name: string | null
  source_external_row_key: string | null
  dedupe_fingerprint: string | null
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function sameMoney(left: unknown, right: unknown) {
  return Math.abs(toNumber(left) - toNumber(right)) < 0.005
}

function cleanString(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null
  const next = String(value).trim().replace(/\s+/g, " ")
  return next.length > 0 ? next : null
}

function splitList(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => cleanString(item)).filter(Boolean))
    ) as string[]
  }
  const text = cleanString(value)
  if (!text) return []
  return Array.from(
    new Set(
      text
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

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeUnitCode(unit: string) {
  return normalizeSearch(unit).replace(/\s+/g, "_")
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value !== "string") return Number.NaN
  return Number(value.trim().replace(/\s+/g, "").replace(",", "."))
}

function buildDedupeFingerprint(input: DirectoryMaterialImportNormalizedRow) {
  return createHash("md5")
    .update(
      [
        normalizeSearch(input.name),
        normalizeSearch(normalizeUnitCode(input.unit)),
        normalizeSearch(input.category),
        normalizeSearch(input.subcategory),
        normalizeSearch(input.code),
        normalizeSearch(input.supplierName),
        normalizeSearch(input.sourceName),
        normalizeSearch(input.sourceExternalRowKey),
      ].join("|")
    )
    .digest("hex")
}

function normalizeImportRow(
  rawData: Record<string, unknown>,
  fallbackSourceName: string | null
) {
  const name =
    cleanString(
      getRawValue(rawData, ["name", "title", "наименование", "название"])
    ) ?? ""
  const unit =
    cleanString(
      getRawValue(rawData, [
        "unit",
        "unit_label",
        "unit_code",
        "единица",
        "ед. изм.",
      ])
    ) ?? ""
  const category =
    cleanString(getRawValue(rawData, ["category", "категория"])) ?? ""
  const price = normalizeNumber(
    getRawValue(rawData, ["price", "price_amount", "rate", "цена"])
  )
  const rawCurrency = cleanString(
    getRawValue(rawData, [
      "currency_code",
      "currencyCode",
      "currency",
      "валюта",
    ])
  )
  const currencyCode = rawCurrency ? rawCurrency.toUpperCase() : "RUB"
  const errors: string[] = []

  if (!name) errors.push("Название материала обязательно")
  if (!unit) errors.push("Единица измерения обязательна")
  if (!category) errors.push("Категория обязательна")
  if (!Number.isFinite(price) || price < 0)
    errors.push("Цена должна быть неотрицательным числом")
  if (!/^[A-Z]{3}$/.test(currencyCode))
    errors.push("Код валюты должен быть в ISO-формате")

  return {
    data: {
      name,
      unit,
      price: Number.isFinite(price) ? price : 0,
      category,
      subcategory: cleanString(
        getRawValue(rawData, ["subcategory", "подкатегория"])
      ),
      code: cleanString(getRawValue(rawData, ["code", "код"])),
      supplierName: cleanString(
        getRawValue(rawData, [
          "supplierName",
          "supplier_name",
          "supplier",
          "поставщик",
        ])
      ),
      imageUrl: cleanString(
        getRawValue(rawData, ["imageUrl", "image_url", "ссылка на изображение"])
      ),
      description: cleanString(
        getRawValue(rawData, ["description", "описание"])
      ),
      aliases: splitList(
        getRawValue(rawData, ["aliases", "alias", "синонимы"])
      ),
      keywords: splitList(
        getRawValue(rawData, ["keywords", "keyword", "ключевые слова"])
      ),
      sourceName:
        cleanString(
          getRawValue(rawData, ["sourceName", "source_name", "источник"])
        ) ?? fallbackSourceName,
      sourceExternalRowKey: cleanString(
        getRawValue(rawData, [
          "sourceExternalRowKey",
          "source_external_row_key",
          "external_id",
        ])
      ),
      currencyCode,
    } satisfies DirectoryMaterialImportNormalizedRow,
    errors,
    warnings: [] as string[],
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
    batchNumber: row.batch_number,
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

function countRows(rows: PreparedRow[]) {
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

async function getPreviewRows(workspaceOwnerId: string, jobId: string) {
  const { data, error } = await supabase
    .from("directory_material_import_rows")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", jobId)
    .order("row_number", { ascending: true })
    .limit(DEFAULT_PREVIEW_LIMIT)

  if (error) throw error
  return ((data ?? []) as ImportRowDbRow[]).map(mapRow)
}

async function requirePreview(workspaceOwnerId: string, id: string) {
  const preview = await getChunkedDirectoryMaterialImportJobForWorkspace(
    workspaceOwnerId,
    id
  )
  if (!preview)
    throw new DirectoryMaterialsApiError(
      "NOT_FOUND",
      "Import job материалов не найден",
      404
    )
  return { data: preview }
}

async function getPriorFingerprints(workspaceOwnerId: string, jobId: string) {
  const { data, error } = await supabase
    .from("directory_material_import_rows")
    .select("dedupe_fingerprint")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", jobId)
    .not("dedupe_fingerprint", "is", null)

  if (error) throw error
  return new Set(
    ((data ?? []) as Array<{ dedupe_fingerprint: string | null }>)
      .map((row) => row.dedupe_fingerprint)
      .filter(Boolean) as string[]
  )
}

async function loadExistingMaterials(workspaceOwnerId: string) {
  const { data, error } = await supabase
    .from("directory_materials")
    .select(
      "id,name,code,normalized_name,unit_code,price_amount,currency_code,source_name,source_external_row_key,dedupe_fingerprint"
    )
    .eq("workspace_owner_id", workspaceOwnerId)
    .is("deleted_at", null)

  if (error) throw error
  return (data ?? []) as ExistingMaterial[]
}

function classifyByExistingCode(
  row: {
    normalizedData: DirectoryMaterialImportNormalizedRow
    warningMessages: string[]
    status: DirectoryMaterialImportRowStatus
    action: DirectoryMaterialImportRowAction
    duplicateMaterialId: string | null
    conflictMaterialIds: string[]
  },
  existing: ExistingMaterial
) {
  const sameName =
    normalizeSearch(existing.normalized_name ?? existing.name) ===
    normalizeSearch(row.normalizedData.name)
  if (!sameName) {
    row.status = "conflict"
    row.action = "skip"
    row.conflictMaterialIds = [existing.id]
    row.warningMessages.push("Код совпадает, но название отличается")
    return
  }

  if (
    sameMoney(existing.price_amount, row.normalizedData.price) &&
    (existing.currency_code ?? "RUB") ===
      (row.normalizedData.currencyCode ?? "RUB")
  ) {
    row.status = "duplicate"
    row.action = "skip"
    row.duplicateMaterialId = existing.id
    row.warningMessages.push(
      "Материал с таким кодом, названием и ценой уже есть"
    )
    return
  }

  row.status = "warning"
  row.action = "update"
  row.duplicateMaterialId = existing.id
  row.warningMessages.push(
    `Цена будет обновлена: ${toNumber(existing.price_amount)} → ${row.normalizedData.price}`
  )
}

function prepareRows(
  input: DirectoryMaterialImportBatchInput,
  fallbackSourceName: string | null,
  prior: Set<string>,
  existing: ExistingMaterial[]
) {
  const seen = new Map<string, number>()
  const existingByCode = new Map(
    existing
      .filter((item) => item.code)
      .map((item) => [item.code as string, item])
  )

  return input.rows.map((rawData, index) => {
    const normalized = normalizeImportRow(rawData, fallbackSourceName)
    const dedupeFingerprint = buildDedupeFingerprint(normalized.data)
    const warningMessages = [...normalized.warnings]
    let status: DirectoryMaterialImportRowStatus =
      normalized.errors.length > 0 ? "error" : "valid"
    let action: DirectoryMaterialImportRowAction =
      status === "error" ? "skip" : "create"
    let duplicateMaterialId: string | null = null
    let conflictMaterialIds: string[] = []

    if (status !== "error" && normalized.data.code) {
      const existingCodeMatch = existingByCode.get(normalized.data.code)
      if (existingCodeMatch) {
        const classified = {
          normalizedData: normalized.data,
          warningMessages,
          status,
          action,
          duplicateMaterialId,
          conflictMaterialIds,
        }
        classifyByExistingCode(classified, existingCodeMatch)
        status = classified.status
        action = classified.action
        duplicateMaterialId = classified.duplicateMaterialId
        conflictMaterialIds = classified.conflictMaterialIds
      }
    }

    if (
      status !== "error" &&
      action === "create" &&
      (prior.has(dedupeFingerprint) || seen.has(dedupeFingerprint))
    ) {
      status = "duplicate"
      action = "skip"
      warningMessages.push(
        seen.has(dedupeFingerprint)
          ? `Дубль строки ${seen.get(dedupeFingerprint)}`
          : "Дубль уже загруженной строки"
      )
    } else if (status !== "error" && action === "create") {
      seen.set(dedupeFingerprint, input.rowOffset + index + 1)
    }

    if (status !== "error" && action === "create") {
      const name = normalizeSearch(normalized.data.name)
      const unitCode = normalizeUnitCode(normalized.data.unit)
      const exact = existing.find((item) => {
        if (
          normalized.data.sourceName &&
          normalized.data.sourceExternalRowKey &&
          item.source_name === normalized.data.sourceName &&
          item.source_external_row_key === normalized.data.sourceExternalRowKey
        )
          return true
        return item.dedupe_fingerprint === dedupeFingerprint
      })

      if (exact) {
        status = "duplicate"
        action = "skip"
        duplicateMaterialId = exact.id
        warningMessages.push("Такой материал уже есть в справочнике")
      } else {
        conflictMaterialIds = existing
          .filter(
            (item) =>
              item.normalized_name === name && item.unit_code === unitCode
          )
          .map((item) => item.id)
        if (conflictMaterialIds.length > 0) {
          status = "conflict"
          action = "skip"
          warningMessages.push(
            "Найден материал с таким названием и единицей измерения"
          )
        }
      }
    }

    if (status === "valid" && warningMessages.length > 0) status = "warning"

    return {
      rowNumber: input.rowOffset + index + 1,
      batchNumber: input.batchNumber,
      rawData,
      normalizedData: normalized.data,
      status,
      action,
      errorMessages: normalized.errors,
      warningMessages,
      duplicateMaterialId,
      conflictMaterialIds,
      dedupeFingerprint,
    } satisfies PreparedRow
  })
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
    subcategory: cleanString(row.subcategory),
    code: cleanString(row.code),
    supplier_name: cleanString(row.supplierName),
    supplier_id: null,
    image_url: cleanString(row.imageUrl),
    description: cleanString(row.description),
    aliases: row.aliases ?? [],
    keywords: row.keywords ?? [],
    source_name: cleanString(row.sourceName),
    source_external_row_key: cleanString(row.sourceExternalRowKey),
    dedupe_fingerprint: "pending",
    search_text: "pending",
    search_fts: "",
    created_by: userId,
    updated_by: userId,
    status: "active",
    version: 1,
  }
}

export async function createChunkedDirectoryMaterialImportJobForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  input: DirectoryMaterialImportCreateInput
): Promise<DirectoryMaterialImportPreviewResponse> {
  const { data, error } = await supabase
    .from("directory_material_import_jobs")
    .insert({
      workspace_owner_id: workspaceOwnerId,
      created_by: userId,
      status: "parsing",
      source_name: cleanString(input.sourceName),
      file_name: cleanString(input.fileName),
      file_mime_type: cleanString(input.fileMimeType),
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
  return { data: { job: mapJob(data as ImportJobDbRow), rows: [] } }
}

export async function appendDirectoryMaterialImportBatchForWorkspace(
  workspaceOwnerId: string,
  id: string,
  input: DirectoryMaterialImportBatchInput
): Promise<DirectoryMaterialImportPreviewResponse> {
  const jobRow = await getJobRow(workspaceOwnerId, id)
  if (!jobRow)
    throw new DirectoryMaterialsApiError(
      "NOT_FOUND",
      "Import job материалов не найден",
      404
    )
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
    throw new DirectoryMaterialsApiError(
      "BAD_REQUEST",
      "В этот импорт нельзя добавить строки",
      400
    )
  }

  const { count, error: countError } = await supabase
    .from("directory_material_import_rows")
    .select("id", { count: "exact", head: true })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", id)
    .eq("batch_number", input.batchNumber)

  if (countError) throw countError
  if ((count ?? 0) > 0) return requirePreview(workspaceOwnerId, id)

  if (input.rows.length === 0) {
    if (input.isLastBatch) {
      const { error } = await supabase
        .from("directory_material_import_jobs")
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
    await getPriorFingerprints(workspaceOwnerId, id),
    await loadExistingMaterials(workspaceOwnerId)
  )
  const counts = countRows(rows)

  const { error: rowsError } = await supabase
    .from("directory_material_import_rows")
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
        duplicate_material_id: row.duplicateMaterialId,
        conflict_material_ids: row.conflictMaterialIds,
        dedupe_fingerprint: row.dedupeFingerprint,
      }))
    )

  if (rowsError) throw rowsError

  const { error: updateError } = await supabase
    .from("directory_material_import_jobs")
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

export async function getChunkedDirectoryMaterialImportJobForWorkspace(
  workspaceOwnerId: string,
  id: string
): Promise<DirectoryMaterialImportPreviewResponse["data"] | null> {
  const jobRow = await getJobRow(workspaceOwnerId, id)
  if (!jobRow) return null
  return {
    job: mapJob(jobRow),
    rows: await getPreviewRows(workspaceOwnerId, id),
  }
}

async function applyMaterialPriceUpdates(
  workspaceOwnerId: string,
  userId: string,
  rows: DirectoryMaterialImportRow[]
) {
  const appliedIds: string[] = []
  const appliedAt = new Date().toISOString()

  await Promise.all(
    rows.map(async (row) => {
      if (!row.duplicateMaterialId) return
      const normalized =
        row.normalizedData as DirectoryMaterialImportNormalizedRow
      const { error } = await supabase
        .from("directory_materials")
        .update({
          price_amount: normalized.price,
          currency_code: normalized.currencyCode ?? "RUB",
          updated_by: userId,
        })
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("id", row.duplicateMaterialId)
        .is("deleted_at", null)

      if (error) throw error
      appliedIds.push(row.duplicateMaterialId)
    })
  )

  if (rows.length > 0) {
    const { error } = await supabase
      .from("directory_material_import_rows")
      .update({ status: "applied", applied_at: appliedAt })
      .eq("workspace_owner_id", workspaceOwnerId)
      .in(
        "id",
        rows.map((row) => row.id)
      )
    if (error) throw error
  }

  return appliedIds
}

export async function applyDirectoryMaterialImportBatchForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string,
  input: DirectoryMaterialImportApplyInput = {}
): Promise<DirectoryMaterialImportApplyResponse> {
  const jobRow = await getJobRow(workspaceOwnerId, id)
  if (!jobRow)
    throw new DirectoryMaterialsApiError(
      "NOT_FOUND",
      "Import job материалов не найден",
      404
    )
  if (!["ready_for_review", "applying"].includes(jobRow.status)) {
    throw new DirectoryMaterialsApiError(
      "BAD_REQUEST",
      "Импорт материалов можно применять только после загрузки всех пакетов",
      400
    )
  }

  const requestedBatchSize = input.batchSize ?? DEFAULT_APPLY_BATCH_SIZE
  const batchSize = Math.max(
    1,
    Math.min(Math.max(requestedBatchSize, DEFAULT_APPLY_BATCH_SIZE), 500)
  )
  await supabase
    .from("directory_material_import_jobs")
    .update({
      status: "applying",
      started_at: jobRow.started_at ?? new Date().toISOString(),
      last_error: null,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)

  const { data, error } = await supabase
    .from("directory_material_import_rows")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("job_id", id)
    .in("action", ["create", "update"])
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
      .from("directory_material_import_jobs")
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
        appliedMaterialIds: [],
        hasMore: false,
      },
    }
  }

  try {
    const createRows = rowsToApply.filter((row) => row.action === "create")
    const updateRows = rowsToApply.filter((row) => row.action === "update")
    const normalizedRows = createRows.map(
      (row) => row.normalizedData as DirectoryMaterialImportNormalizedRow
    )
    const { data: inserted, error: insertError } =
      normalizedRows.length > 0
        ? await supabase
            .from("directory_materials")
            .insert(
              normalizedRows.map((row) =>
                toInsertRow(workspaceOwnerId, userId, row)
              )
            )
            .select("id")
        : { data: [], error: null }

    if (insertError) throw insertError
    const createdIds = ((inserted ?? []) as Array<{ id: string }>).map(
      (material) => material.id
    )
    const updatedIds = await applyMaterialPriceUpdates(
      workspaceOwnerId,
      userId,
      updateRows
    )
    const appliedAt = new Date().toISOString()

    if (createRows.length > 0) {
      const { error: rowsUpdateError } = await supabase
        .from("directory_material_import_rows")
        .update({ status: "applied", applied_at: appliedAt })
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("job_id", id)
        .in(
          "id",
          createRows.map((row) => row.id)
        )

      if (rowsUpdateError) throw rowsUpdateError
    }

    const appliedIds = [...createdIds, ...updatedIds]
    const nextAppliedRows = toNumber(jobRow.applied_rows) + rowsToApply.length
    const completed = !hasMore
    const skippedRows = completed
      ? Math.max(0, toNumber(jobRow.total_rows) - nextAppliedRows)
      : toNumber(jobRow.skipped_rows)
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
        appliedMaterialIds: appliedIds,
        hasMore,
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
            : "Не удалось применить пакет импорта материалов",
        completed_at: new Date().toISOString(),
      })
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("id", id)
    throw err
  }
}
