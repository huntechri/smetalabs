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

export type DirectoryMaterialsExportFile = {
  body: string
  contentType: string
  extension: DirectoryMaterialsExportFormat
}
