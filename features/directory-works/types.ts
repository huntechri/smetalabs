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
