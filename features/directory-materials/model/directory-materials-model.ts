// ─── Domain types ─────────────────────────────────────────────────────────────

export type DirectoryMaterialStatus = "active" | "archived"
export type DirectoryMaterialsSort = "relevance" | "updated_desc" | "name_asc"
export type DirectoryMaterialsExportFormat = "csv"

export type DirectoryMaterialsExportFile = {
  body: string
  contentType: string
  extension: DirectoryMaterialsExportFormat
}

export type DirectoryMaterialsListParams = {
  q?: string
  category?: string
  subcategory?: string
  unit?: string
  status?: DirectoryMaterialStatus
  supplier?: string
  limit?: number
  cursor?: number
  sort?: DirectoryMaterialsSort
}

export type DirectoryMaterialsCategoriesParams = {
  status?: DirectoryMaterialStatus
  category?: string
  subcategory?: string
}

export type DirectoryMaterialMutationInput = {
  name: string
  unit: string
  price: number
  category: string
  subcategory?: string | null
  code?: string | null
  supplierName?: string | null
  imageUrl?: string | null
  description?: string | null
  aliases?: string[]
  keywords?: string[]
  sourceName?: string | null
  sourceExternalRowKey?: string | null
  currencyCode?: string
}

export type DirectoryMaterial = {
  id: string
  name: string
  unit: string
  unitCode: string
  unitLabel: string
  price: number
  priceAmount: number
  currencyCode: string
  category: string
  subcategory: string | null
  code: string | null
  supplierName: string | null
  supplierId: string | null
  imageUrl: string | null
  description: string | null
  aliases: string[]
  keywords: string[]
  status: DirectoryMaterialStatus
  version: number
  metadata: {
    sourceName: string | null
    sourceExternalRowKey: string | null
    createdAt: string
    updatedAt: string
    searchRank?: number | null
  }
}

export type DirectoryMaterialsListMeta = {
  limit: number
  cursor: number
  nextCursor: number | null
  hasMore: boolean
  total: number
}

export type DirectoryMaterialsListResponse = {
  data: DirectoryMaterial[]
  meta: DirectoryMaterialsListMeta
}

export type DirectoryMaterialCategoryOption = {
  category: string
  total: number
  subcategories: Array<{ name: string; total: number }>
}

export type DirectoryMaterialUnitOption = {
  code: string
  label: string
  total: number
}

export type DirectoryMaterialSupplierOption = {
  name: string
  total: number
}

export type DirectoryMaterialsCategoriesResponse = {
  data: {
    categories: DirectoryMaterialCategoryOption[]
    units: DirectoryMaterialUnitOption[]
    suppliers: DirectoryMaterialSupplierOption[]
  }
  meta: { totalCategories: number; totalUnits: number; totalSuppliers: number }
}

export type DirectoryMaterialImportJobStatus =
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

export type DirectoryMaterialImportRowStatus =
  | "pending"
  | "valid"
  | "warning"
  | "error"
  | "duplicate"
  | "conflict"
  | "applied"
  | "skipped"

export type DirectoryMaterialImportRowAction = "create" | "update" | "skip"

export type DirectoryMaterialImportRawRow = Partial<{
  code: string
  name: string
  unit: string
  price: string | number
  category: string
  subcategory: string
  supplierName: string
  supplier_name: string
  description: string
  aliases: string | string[]
  keywords: string | string[]
  imageUrl: string
  image_url: string
  currencyCode: string
  currency_code: string
  sourceName: string
  source_name: string
  sourceExternalRowKey: string
  source_external_row_key: string
}>

export type DirectoryMaterialImportNormalizedRow =
  DirectoryMaterialMutationInput & {
    aliases: string[]
    keywords: string[]
  }

export type DirectoryMaterialImportJob = {
  id: string
  status: DirectoryMaterialImportJobStatus
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

export type DirectoryMaterialImportRow = {
  id: string
  jobId: string
  rowNumber: number
  batchNumber?: number | null
  rawData: Record<string, unknown>
  normalizedData: DirectoryMaterialImportNormalizedRow | Record<string, unknown>
  status: DirectoryMaterialImportRowStatus
  action: DirectoryMaterialImportRowAction | null
  errorMessages: string[]
  warningMessages: string[]
  duplicateMaterialId: string | null
  conflictMaterialIds: string[]
  dedupeFingerprint: string | null
  appliedMaterialId: string | null
  appliedAt: string | null
  createdAt: string
  updatedAt: string
}

export type DirectoryMaterialImportCreateInput = {
  rows: Array<Record<string, unknown>>
  fileName?: string | null
  fileMimeType?: string | null
  fileSizeBytes?: number | null
  sourceName?: string | null
  options?: Record<string, unknown>
}

export type DirectoryMaterialImportBatchInput = {
  batchNumber: number
  rowOffset: number
  rows: Array<Record<string, unknown>>
  isLastBatch?: boolean
}

export type DirectoryMaterialImportApplyInput = { batchSize?: number }

export type DirectoryMaterialImportPreviewResponse = {
  data: { job: DirectoryMaterialImportJob; rows: DirectoryMaterialImportRow[] }
}

export type DirectoryMaterialImportApplyResponse = {
  data: {
    job: DirectoryMaterialImportJob
    appliedRows: number
    createdRows?: number
    updatedRows?: number
    skippedRows: number
    conflictRows?: number
    appliedMaterialIds?: string[]
    hasMore?: boolean
    nextBatchSize?: number
  }
}

// ─── Form state ───────────────────────────────────────────────────────────────

export type DirectoryMaterialFormState = {
  name: string
  unit: string
  price: string
  category: string
  subcategory: string
  code: string
  supplierName: string
}

// ─── Events ───────────────────────────────────────────────────────────────────

export const DIRECTORY_MATERIALS_CREATE_EVENT = "directory-materials:create"
export const DIRECTORY_MATERIALS_IMPORT_EVENT = "directory-materials:import"

export function dispatchDirectoryMaterialsCreateEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_MATERIALS_CREATE_EVENT))
}

export function dispatchDirectoryMaterialsImportEvent() {
  window.dispatchEvent(new CustomEvent(DIRECTORY_MATERIALS_IMPORT_EVENT))
}

// ─── Import dialog constants ───────────────────────────────────────────────────

export const DIRECTORY_MATERIALS_IMPORT_BATCH_SIZE = 300
export const DIRECTORY_MATERIALS_APPLY_BATCH_SIZE = 500

export const DIRECTORY_MATERIALS_HEADER_ALIASES: Record<string, string> = {
  code: "code",
  код: "code",
  name: "name",
  title: "name",
  название: "name",
  наименование: "name",
  unit: "unit",
  "ед. изм.": "unit",
  "ед изм": "unit",
  единица: "unit",
  price: "price",
  price_amount: "price",
  rate: "price",
  цена: "price",
  category: "category",
  категория: "category",
  subcategory: "subcategory",
  подкатегория: "subcategory",
  supplier: "supplierName",
  supplier_name: "supplierName",
  suppliername: "supplierName",
  поставщик: "supplierName",
  description: "description",
  описание: "description",
  image_url: "imageUrl",
  imageurl: "imageUrl",
  "ссылка на изображение": "imageUrl",
  currency_code: "currencyCode",
  currencycode: "currencyCode",
  currency: "currencyCode",
  валюта: "currencyCode",
  source_name: "sourceName",
  sourcename: "sourceName",
  источник: "sourceName",
  source_external_row_key: "sourceExternalRowKey",
  sourceexternalrowkey: "sourceExternalRowKey",
  external_id: "sourceExternalRowKey",
}

export const DIRECTORY_MATERIALS_IMPORT_STATUS_LABELS: Record<
  DirectoryMaterialImportRowStatus,
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

// ─── Pure selectors / mappers ─────────────────────────────────────────────────

type ReadonlySearchParams = {
  get: (name: string) => string | null
}

export function getMaterialStringParam(
  searchParams: ReadonlySearchParams,
  key: string
): string | undefined {
  const value = searchParams.get(key)?.trim()
  return value || undefined
}

export function getMaterialNumberParam(
  searchParams: ReadonlySearchParams,
  key: string
): number | undefined {
  const value = searchParams.get(key)
  if (!value) return undefined

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

export function getMaterialsSortParam(
  searchParams: ReadonlySearchParams
): DirectoryMaterialsSort | undefined {
  const sort = searchParams.get("sort")
  if (sort === "relevance" || sort === "updated_desc" || sort === "name_asc")
    return sort
  return undefined
}

export function getDirectoryMaterialsListParams(
  searchParams: ReadonlySearchParams
): DirectoryMaterialsListParams {
  return {
    q: getMaterialStringParam(searchParams, "q"),
    category: getMaterialStringParam(searchParams, "category"),
    subcategory: getMaterialStringParam(searchParams, "subcategory"),
    unit: getMaterialStringParam(searchParams, "unit"),
    status: searchParams.get("status") === "archived" ? "archived" : "active",
    supplier: getMaterialStringParam(searchParams, "supplier"),
    limit: getMaterialNumberParam(searchParams, "limit") ?? 50,
    cursor: getMaterialNumberParam(searchParams, "cursor") ?? 0,
    sort: getMaterialsSortParam(searchParams) ?? "relevance",
  }
}

export function getDirectoryMaterialInitialFormState(
  material?: DirectoryMaterial | null
): DirectoryMaterialFormState {
  if (!material) {
    return {
      name: "",
      unit: "",
      price: "",
      category: "",
      subcategory: "",
      code: "",
      supplierName: "",
    }
  }

  return {
    name: material.name,
    unit: material.unitLabel || material.unit,
    price: String(material.priceAmount),
    category: material.category,
    subcategory: material.subcategory ?? "",
    code: material.code ?? "",
    supplierName: material.supplierName ?? "",
  }
}

export function buildDirectoryMaterialMutationInput(
  state: DirectoryMaterialFormState,
  existing?: DirectoryMaterial | null
): DirectoryMaterialMutationInput {
  return {
    name: state.name.trim(),
    unit: state.unit.trim(),
    price: Number(state.price),
    category: state.category.trim(),
    subcategory: state.subcategory.trim() || null,
    code: state.code.trim() || null,
    supplierName: state.supplierName.trim() || null,
    imageUrl: existing?.imageUrl ?? null,
    description: existing?.description ?? null,
    sourceName: existing?.metadata.sourceName ?? null,
    sourceExternalRowKey: existing?.metadata.sourceExternalRowKey ?? null,
    currencyCode: existing?.currencyCode ?? "RUB",
  }
}

export function validateDirectoryMaterialFormState(
  state: DirectoryMaterialFormState
): string | null {
  const name = state.name.trim()
  const unit = state.unit.trim()
  const category = state.category.trim()
  const price = Number(state.price)

  if (!name || !unit || !category) {
    return "Заполните название, единицу измерения и категорию"
  }

  if (!Number.isFinite(price) || price < 0) {
    return "Цена должна быть неотрицательным числом"
  }

  return null
}

export function formatMaterialImportBytes(
  bytes: number | null | undefined
): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}
