export type PurchaseRow = {
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
}
