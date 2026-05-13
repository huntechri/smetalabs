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
  subcategories: Array<{
    name: string
    total: number
  }>
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
  meta: {
    totalCategories: number
    totalUnits: number
  }
}
