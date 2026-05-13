"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchSettings } from "../api/settings-client"
import { settingsQueryKeys } from "../api/settings-query-keys"

export function useSettings() {
  const query = useQuery({
    queryKey: settingsQueryKeys.account(),
    queryFn: fetchSettings,
  })

  return {
    settings: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: async () => {
      await query.refetch()
    },
  }
}
