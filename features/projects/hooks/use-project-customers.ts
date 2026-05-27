"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchDirectoryCounterparties } from "@/features/directory-counterparties/api/directory-counterparties-client"
import { directoryCounterpartiesQueryKeys } from "@/features/directory-counterparties/api/directory-counterparties-query-keys"

const CUSTOMER_LIST_PARAMS = {
  status: "active" as const,
  limit: 100,
  cursor: 0,
  sort: "name_asc" as const,
}

export function useProjectCustomers(enabled: boolean = true) {
  const query = useQuery({
    queryKey: directoryCounterpartiesQueryKeys.list(CUSTOMER_LIST_PARAMS),
    queryFn: () => fetchDirectoryCounterparties(CUSTOMER_LIST_PARAMS),
    enabled,
    staleTime: 30_000,
  })

  const customers = (query.data?.data ?? []).filter(
    (counterparty) => counterparty.type === "customer"
  )

  return {
    customers,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
