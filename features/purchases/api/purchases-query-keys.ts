import type { EstimatePurchasesParams } from "./purchases-client"

export const purchasesQueryKeys = {
  all: ["estimatePurchases"] as const,
  list: (params: EstimatePurchasesParams) =>
    [...purchasesQueryKeys.all, "list", params] as const,
}
