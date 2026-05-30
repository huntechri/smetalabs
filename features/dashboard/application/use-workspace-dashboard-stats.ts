"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchWorkspaceDashboardStats } from "../api/dashboard-api"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import { processChartData } from "@/features/projects/hooks/use-project-dashboard-stats"

export function useWorkspaceDashboardStats(timeRange: string = "90d") {
  const query = useQuery({
    queryKey: projectsQueryKeys.workspaceStats(),
    queryFn: fetchWorkspaceDashboardStats,
    staleTime: 10_000,
  })

  const stats = query.data ?? null

  const chartData = useMemo(() => {
    if (!stats?.transactions) return []
    return processChartData(stats.transactions, timeRange)
  }, [stats?.transactions, timeRange])

  return {
    stats,
    chartData,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: async () => {
      await query.refetch()
    },
  }
}
