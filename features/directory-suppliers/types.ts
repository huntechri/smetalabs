export type DirectorySupplierStatus = "active" | "archived"
export type DirectorySupplierLegalStatus = "juridical" | "individual"
export type DirectorySuppliersSort = "relevance" | "updated_desc" | "name_asc"

export type DirectorySuppliersListParams = {
  q?: string
  status?: DirectorySupplierStatus
  limit?: number
  cursor?: number
  sort?: DirectorySuppliersSort
}

export type DirectorySupplierMutationInput = {
  name: string
  legalStatus: DirectorySupplierLegalStatus
  color?: string | null
  inn?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export type DirectorySupplier = {
  id: string
  name: string
  normalizedName: string
  legalStatus: DirectorySupplierLegalStatus
  color: string
  inn: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  status: DirectorySupplierStatus
  version: number
  metadata: {
    createdAt: string
    updatedAt: string
  }
}

export type DirectorySuppliersListMeta = {
  limit: number
  cursor: number
  nextCursor: number | null
  hasMore: boolean
  total: number
}

export type DirectorySuppliersListResponse = {
  data: DirectorySupplier[]
  meta: DirectorySuppliersListMeta
}
