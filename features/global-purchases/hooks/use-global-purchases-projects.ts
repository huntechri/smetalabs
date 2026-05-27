"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchProjects } from "@/features/projects/api/projects-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"

export function useGlobalPurchasesProjects() {
  const query = useQuery({
    queryKey: projectsQueryKeys.list({
      status: "all",
      limit: 100,
      sort: "title_asc",
    }),
    queryFn: () =>
      fetchProjects({ status: "all", limit: 100, sort: "title_asc" }),
    staleTime: 30_000,
  })

  return {
    projects: query.data?.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
