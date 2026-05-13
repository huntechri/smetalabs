"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchWorkspaceOverview } from "../api/team-client"
import { teamQueryKeys } from "../api/team-query-keys"

export function useWorkspaceOverview() {
  const query = useQuery({
    queryKey: teamQueryKeys.overview(),
    queryFn: fetchWorkspaceOverview,
  })

  return {
    overview: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: async () => {
      await query.refetch()
    },
  }
}
