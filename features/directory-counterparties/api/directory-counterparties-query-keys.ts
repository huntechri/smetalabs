import type { DirectoryCounterpartiesListParams } from "../types"

export const directoryCounterpartiesQueryKeys = {
  all: ["directoryCounterparties"] as const,
  lists: () => [...directoryCounterpartiesQueryKeys.all, "list"] as const,
  list: (params: DirectoryCounterpartiesListParams = {}) =>
    [...directoryCounterpartiesQueryKeys.lists(), params] as const,
  details: () => [...directoryCounterpartiesQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...directoryCounterpartiesQueryKeys.details(), id] as const,
}

export const directoryCounterpartiesCacheTags = {
  list: (workspaceOwnerId: string) => `directory-counterparties:${workspaceOwnerId}`,
  detail: (workspaceOwnerId: string, counterpartyId: string) =>
    `directory-counterparty:${workspaceOwnerId}:${counterpartyId}`,
}
