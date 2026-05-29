export type PurchaseRow = {
  purchaseId: string | null
  materialId: string | null
  title: string
  unit: string
  planQuantity: number
  planPrice: number
  planTotal: number
  factQuantity: number | null
  factAvgPrice: number | null
  factTotal: number | null
  deviationTotal: number | null
  source: "estimate" | "global" | "mixed" | null
  editable: boolean
}

export type AddPurchaseInput = {
  directoryMaterialId: string
  quantity: number
  price: number
}

export type UpdatePurchaseInput = {
  quantity?: number
  price?: number
}
