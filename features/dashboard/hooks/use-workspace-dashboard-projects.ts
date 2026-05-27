"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchProjects } from "@/features/projects/api/projects-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"

export function useWorkspaceDashboardProjects() {
  const query = useQuery({
    queryKey: projectsQueryKeys.list({ status: "in_progress", limit: 100 }),
    queryFn: () => fetchProjects({ status: "in_progress", limit: 100 }),
    staleTime: 30_000,
  })

  return {
    projects: query.data?.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: async () => {
      await query.refetch()
    },
  }
}
