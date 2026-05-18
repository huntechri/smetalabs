export type GlobalPurchaseStatus =
  | "planned"
  | "ordered"
  | "partially_received"
  | "received"
  | "cancelled"

export type GlobalPurchasesStatusFilter = GlobalPurchaseStatus | "all"
export type GlobalPurchasesSort = "relevance" | "updated_desc" | "title_asc"

export type GlobalPurchasesListParams = {
  q?: string
  status?: GlobalPurchasesStatusFilter
  projectId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  cursor?: number
  sort?: GlobalPurchasesSort
}

export type GlobalPurchaseMutationInput = {
  title: string
  unit: string
  planQuantity: number
  planPrice: number
  factQuantity?: number | null
  factPrice?: number | null
  supplierId?: string | null
  projectId?: string | null
  purchaseDate?: string | null
  status?: GlobalPurchaseStatus
  notes?: string | null
}

export type GlobalPurchaseRow = {
  id: string
  title: string
  unit: string
  planQuantity: number
  planPrice: number
  factQuantity: number | null
  factPrice: number | null
  planTotal: number
  factTotal: number | null
  deviationTotal: number | null
  supplierId: string | null
  supplierName: string | null
  projectId: string | null
  projectTitle: string | null
  purchaseDate: string | null
  status: GlobalPurchaseStatus
  notes: string | null
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string | null
    updatedBy: string | null
  }
}

export type GlobalPurchasesListResponse = {
  data: GlobalPurchaseRow[]
  meta: {
    limit: number
    cursor: number
    nextCursor: number | null
    hasMore: boolean
    total: number
  }
}
