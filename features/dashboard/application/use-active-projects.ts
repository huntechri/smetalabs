"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchProjects } from "../api/dashboard-api"

export function useActiveProjects() {
  const { data: projectsData, isLoading, error } = useQuery({
    queryKey: ["projects", "dashboard-in-progress"],
    queryFn: () => fetchProjects({ status: "in_progress", limit: 100 }),
    staleTime: 30_000,
  })

  const projects = useMemo(() => {
    return projectsData?.data ?? []
  }, [projectsData])

  return {
    projects,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
