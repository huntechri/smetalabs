import { purchaseRows } from "@/features/purchases/__mocks__/purchases"

export function usePurchases() {
  return { purchases: purchaseRows }
}
