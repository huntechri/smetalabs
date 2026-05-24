import type { EstimatePurchasesParams } from "./purchases-client"

export const purchasesQueryKeys = {
  all: ["estimatePurchases"] as const,
  list: (params: EstimatePurchasesParams) =>
    [...purchasesQueryKeys.all, "list", params] as const,
  mutations: {
    add: () => [...purchasesQueryKeys.all, "add"] as const,
    update: (purchaseId: string) =>
      [...purchasesQueryKeys.all, "update", purchaseId] as const,
    archive: (purchaseId: string) =>
      [...purchasesQueryKeys.all, "archive", purchaseId] as const,
  },
}
