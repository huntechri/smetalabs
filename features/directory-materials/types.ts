export type DirectoryMaterialStatus = "active" | "archived"
export type DirectoryMaterialsSort = "relevance" | "updated_desc" | "name_asc"
export type DirectoryMaterialsExportFormat = "csv"

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
  subcategories: Array<{
    name: string
    total: number
  }>
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
  meta: {
    totalCategories: number
    totalUnits: number
    totalSuppliers: number
  }
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
  imageUrl: string
  image_url: string
  currencyCode: string
  currency_code: string
  sourceName: string
  source_name: string
  sourceExternalRowKey: string
  source_external_row_key: string
}>

export type DirectoryMaterialImportNormalizedRow = DirectoryMaterialMutationInput

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
  batchNumber: number | null
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
  rows?: Array<Record<string, unknown>>
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

export type DirectoryMaterialImportApplyInput = {
  batchSize?: number
}

export type DirectoryMaterialImportPreviewResponse = {
  data: {
    job: DirectoryMaterialImportJob
    rows: DirectoryMaterialImportRow[]
  }
}

export type DirectoryMaterialImportApplyResponse = {
  data: {
    job: DirectoryMaterialImportJob
    appliedRows: number
    skippedRows: number
    appliedMaterialIds?: string[]
    hasMore?: boolean
  }
}

export type DirectoryMaterialsExportFile = {
  body: string
  contentType: string
  extension: DirectoryMaterialsExportFormat
}
