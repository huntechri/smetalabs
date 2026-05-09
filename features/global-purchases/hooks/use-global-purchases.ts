import { useState } from "react"
import { globalPurchasesRows as mockRows } from "@/features/global-purchases/__mocks__/global-purchases"
import type { GlobalPurchaseRow } from "@/types/global-purchases"

export function useGlobalPurchases() {
  const [purchases, setPurchases] = useState(mockRows)

  const updateGlobalPurchase = (id: string, updates: Partial<GlobalPurchaseRow>) => {
    setPurchases((current) =>
      current.map((row) => (row.id === id ? { ...row, ...updates } : row))
    )
  }

  return { purchases, updateGlobalPurchase }
}
