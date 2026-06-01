// ─── Domain types ─────────────────────────────────────────────────────────────

export type DirectoryWorkStatus = "active" | "archived"
export type DirectoryWorkPriceKind =
  | "base"
  | "labor"
  | "turnkey"
  | "estimate"
  | "custom"

export type DirectoryWorksSort = "relevance" | "updated_desc" | "title_asc"

export type DirectoryWorksListParams = {
  q?: string
  category?: string
  subcategory?: string
  unit?: string
  status?: DirectoryWorkStatus
  limit?: number
  cursor?: number
  sort?: DirectoryWorksSort
}

export type DirectoryWorkMutationInput = {
  title: string
  unit: string
  rate: number
  category: string
  subcategory?: string | null
  code?: string | null
  description?: string | null
  includedOperations?: string | null
  excludedOperations?: string | null
  sourceName?: string | null
  sourceExternalRowKey?: string | null
  currencyCode?: string
  priceKind?: DirectoryWorkPriceKind
  insertAfterWorkId?: string | null
}

export type DirectoryWork = {
  id: string
  title: string
  unit: string
  unitCode: string
  unitLabel: string
  rate: number
  rateAmount: number
  currencyCode: string
  priceKind: DirectoryWorkPriceKind
  category: string
  subcategory: string | null
  code: string | null
  description: string | null
  includedOperations: string | null
  excludedOperations: string | null
  aliases: string[]
  keywords: string[]
  status: DirectoryWorkStatus
  version: number
  metadata: {
    sourceName: string | null
    sourceExternalRowKey: string | null
    createdAt: string
    updatedAt: string
    searchRank?: number | null
  }
}

export type DirectoryWorksListMeta = {
  limit: number
  cursor: number
  nextCursor: number | null
  hasMore: boolean
  total: number
}

export type DirectoryWorksListResponse = {
  data: DirectoryWork[]
  meta: DirectoryWorksListMeta
}

export type DirectoryWorkCategoryOption = {
  category: string
  total: number
  subcategories: Array<{ name: string; total: number }>
}

export type DirectoryWorkUnitOption = {
  code: string
  label: string
  total: number
}

export type DirectoryWorksCategoriesResponse = {
  data: {
    categories: DirectoryWorkCategoryOption[]
    units: DirectoryWorkUnitOption[]
  }
  meta: { totalCategories: number; totalUnits: number }
}

export type DirectoryWorkAiSearchInput = {
  query: string
  category?: string
  subcategory?: string
  unit?: string
  limit?: number
  threshold?: number
}

export type DirectoryWorkAiSearchResult = DirectoryWork & {
  semanticScore: number | null
  textScore: number | null
  hybridScore: number
  matchReason: "exact_text" | "text_match" | "hybrid_match" | "semantic_match"
}

export type DirectoryWorkAiSearchResponse = {
  data: DirectoryWorkAiSearchResult[]
  meta: {
    limit: number
    total: number
    modelName: string
    dimensions: number
    distanceOperator: "cosine"
    threshold: number
  }
}

export type DirectoryWorkEmbeddingProcessResponse = {
  data: {
    processed: number
    failed: number
    pending: number
    modelName: string
    dimensions: number
  }
}

export type DirectoryWorkImportJobStatus =
  | "draft"
  | "uploaded"
  | "parsing"
  | "parsed"
  | "validating"
  | "validated"
  | "ready_for_review"
  | "applying"
  | "completed"
  | "failed"
  | "cancelled"
  | "skipped" // added if used

export type DirectoryWorkImportRowStatus =
  | "pending"
  | "valid"
  | "warning"
  | "error"
  | "duplicate"
  | "conflict"
  | "applied"
  | "skipped"

export type DirectoryWorkImportRowAction = "create" | "update" | "skip"

export type DirectoryWorkImportRawRow = Partial<{
  code: string
  title: string
  unit: string
  rate: string | number
  category: string
  subcategory: string
  aliases: string | string[]
  keywords: string | string[]
  description: string
  included_operations: string
  excluded_operations: string
  price_kind: DirectoryWorkPriceKind
  currency_code: string
  vat_rate: string | number
  source_name: string
  source_external_row_key: string
  effective_date: string
}>

export type DirectoryWorkImportNormalizedRow = Omit<
  DirectoryWorkMutationInput,
  "insertAfterWorkId"
> & {
  aliases: string[]
  keywords: string[]
  vatRate: number | null
  effectiveDate: string | null
}

export type DirectoryWorkImportJob = {
  id: string
  status: DirectoryWorkImportJobStatus
  sourceName: string | null
  fileName: string | null
  fileMimeType: string | null
  fileSizeBytes: number | null
  totalRows: number
  parsedRows: number
  validRows: number
  warningRows: number
  errorRows: number
  duplicateRows: number
  conflictRows: number
  appliedRows: number
  skippedRows: number
  options: Record<string, unknown>
  summary: Record<string, unknown>
  lastError: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type DirectoryWorkImportRow = {
  id: string
  jobId: string
  rowNumber: number
  batchNumber?: number | null
  rawData: Record<string, unknown>
  normalizedData: DirectoryWorkImportNormalizedRow | Record<string, unknown>
  status: DirectoryWorkImportRowStatus
  action: DirectoryWorkImportRowAction | null
  errorMessages: string[]
  warningMessages: string[]
  duplicateWorkId: string | null
  conflictWorkIds: string[]
  dedupeFingerprint: string | null
  appliedWorkId: string | null
  appliedAt: string | null
  createdAt: string
  updatedAt: string
}

export type DirectoryWorkImportCreateInput = {
  rows: Array<Record<string, unknown>>
  fileName?: string | null
  fileMimeType?: string | null
  fileSizeBytes?: number | null
  sourceName?: string | null
  options?: Record<string, unknown>
}

export type DirectoryWorkImportBatchInput = {
  batchNumber: number
  rowOffset: number
  rows: Array<Record<string, unknown>>
  isLastBatch?: boolean
}

export type DirectoryWorkImportApplyInput = { batchSize?: number }

export type DirectoryWorkImportPreviewResponse = {
  data: { job: DirectoryWorkImportJob; rows: DirectoryWorkImportRow[] }
}

export type DirectoryWorkImportApplyResponse = {
  data: {
    job: DirectoryWorkImportJob
    appliedRows: number
    skippedRows: number
    appliedWorkIds?: string[]
    hasMore?: boolean
  }
}

export type DirectoryWorksExportFormat = "csv" | "xlsx"

// ─── Form state ───────────────────────────────────────────────────────────────

export type DirectoryWorkFormState = {
  title: string
  unit: string
  rate: string
  category: string
  subcategory: string
}

export const emptyWorkFormState: DirectoryWorkFormState = {
  title: "",
  unit: "",
  rate: "",
  category: "",
  subcategory: "",
}

export function getDirectoryWorkInitialFormState(
  work?: DirectoryWork | null
): DirectoryWorkFormState {
  if (!work) return emptyWorkFormState

  return {
    title: work.title,
    unit: work.unitLabel || work.unit,
    rate: String(work.rateAmount),
    category: work.category,
    subcategory: work.subcategory ?? "",
  }
}

export function buildDirectoryWorkMutationInput(
  state: DirectoryWorkFormState,
  existing?: DirectoryWork | null
): DirectoryWorkMutationInput {
  return {
    title: state.title.trim(),
    unit: state.unit.trim(),
    rate: Number(state.rate),
    category: state.category.trim(),
    subcategory: state.subcategory.trim() || null,
    code: existing?.code ?? null,
    description: existing?.description ?? null,
    includedOperations: existing?.includedOperations ?? null,
    excludedOperations: existing?.excludedOperations ?? null,
    sourceName: existing?.metadata.sourceName ?? null,
    sourceExternalRowKey: existing?.metadata.sourceExternalRowKey ?? null,
    currencyCode: existing?.currencyCode ?? "RUB",
    priceKind: existing?.priceKind ?? "base",
  }
}

export function validateDirectoryWorkFormState(
  state: DirectoryWorkFormState
): string | null {
  const title = state.title.trim()
  const unit = state.unit.trim()
  const category = state.category.trim()
  const rate = Number(state.rate)

  if (!title || !unit || !category) {
    return "Заполните название, единицу измерения и категорию"
  }

  if (!Number.isFinite(rate) || rate < 0) {
    return "Расценка должна быть неотрицательным числом"
  }

  return null
}

// ─── Search / URL parameters selectors ────────────────────────────────────────

type ReadonlySearchParams = {
  get: (name: string) => string | null
}

export function getDirectoryWorkStringParam(
  searchParams: ReadonlySearchParams,
  key: string
): string | undefined {
  const value = searchParams.get(key)?.trim()
  return value || undefined
}

export function getDirectoryWorkNumberParam(
  searchParams: ReadonlySearchParams,
  key: string
): number | undefined {
  const value = searchParams.get(key)
  if (!value) return undefined

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

export function getDirectoryWorksSortParam(
  searchParams: ReadonlySearchParams
): DirectoryWorksSort | undefined {
  const sort = searchParams.get("sort")
  if (sort === "relevance" || sort === "updated_desc" || sort === "title_asc")
    return sort
  return undefined
}

export function getDirectoryWorksListParams(
  searchParams: ReadonlySearchParams
): DirectoryWorksListParams {
  return {
    q: getDirectoryWorkStringParam(searchParams, "q"),
    category: getDirectoryWorkStringParam(searchParams, "category"),
    subcategory: getDirectoryWorkStringParam(searchParams, "subcategory"),
    unit: getDirectoryWorkStringParam(searchParams, "unit"),
    status: searchParams.get("status") === "archived" ? "archived" : "active",
    limit: getDirectoryWorkNumberParam(searchParams, "limit") ?? 50,
    cursor: getDirectoryWorkNumberParam(searchParams, "cursor") ?? 0,
    sort: getDirectoryWorksSortParam(searchParams) ?? "relevance",
  }
}

// ─── Import dialog constants & helpers ────────────────────────────────────────

export const DIRECTORY_WORKS_IMPORT_BATCH_SIZE = 1500
export const DIRECTORY_WORKS_APPLY_BATCH_SIZE = 200

export const DIRECTORY_WORKS_HEADER_ALIASES: Record<string, string> = {
  code: "code",
  код: "code",
  title: "title",
  name: "title",
  название: "title",
  наименование: "title",
  unit: "unit",
  "ед. изм.": "unit",
  "ед изм": "unit",
  единица: "unit",
  rate: "rate",
  price: "rate",
  расценка: "rate",
  цена: "rate",
  category: "category",
  категория: "category",
  subcategory: "subcategory",
  подкатегория: "subcategory",
  aliases: "aliases",
  синонимы: "aliases",
  keywords: "keywords",
  "ключевые слова": "keywords",
  description: "description",
  описание: "description",
  included_operations: "included_operations",
  "включенные операции": "included_operations",
  excluded_operations: "excluded_operations",
  "исключенные операции": "excluded_operations",
  price_kind: "price_kind",
  "тип цены": "price_kind",
  currency_code: "currency_code",
  currency: "currency_code",
  валюта: "currency_code",
  vat_rate: "vat_rate",
  ндс: "vat_rate",
  source_name: "source_name",
  источник: "source_name",
  source_external_row_key: "source_external_row_key",
  external_id: "source_external_row_key",
  effective_date: "effective_date",
}

export const DIRECTORY_WORKS_IMPORT_STATUS_LABELS: Record<
  DirectoryWorkImportRowStatus,
  string
> = {
  pending: "Ожидает",
  valid: "Готово",
  warning: "Предупреждение",
  error: "Ошибка",
  duplicate: "Дубль",
  conflict: "Конфликт",
  applied: "Применено",
  skipped: "Пропущено",
}

export function formatWorkImportBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

// ─── Events ───────────────────────────────────────────────────────────────────

export const DIRECTORY_WORKS_CREATE_EVENT = "directory-works:create"
export const DIRECTORY_WORKS_IMPORT_EVENT = "directory-works:import"
export const DIRECTORY_WORKS_EXPORT_EVENT = "directory-works:export"

export function dispatchDirectoryWorksCreateEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_WORKS_CREATE_EVENT))
}

export function dispatchDirectoryWorksImportEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_WORKS_IMPORT_EVENT))
}

export function dispatchDirectoryWorksExportEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_WORKS_EXPORT_EVENT))
}
