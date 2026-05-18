import type { GlobalPurchasesListParams } from "@/types/global-purchases"

export const globalPurchasesQueryKeys = {
  all: ["globalPurchases"] as const,
  list: (params: GlobalPurchasesListParams = {}) =>
    [...globalPurchasesQueryKeys.all, "list", params] as const,
  detail: (id: string) => [...globalPurchasesQueryKeys.all, "detail", id] as const,
}

export const globalPurchasesCacheTags = {
  list: (workspaceOwnerId: string) => `global-purchases:${workspaceOwnerId}`,
  detail: (workspaceOwnerId: string, purchaseId: string) =>
    `global-purchase:${workspaceOwnerId}:${purchaseId}`,
}
