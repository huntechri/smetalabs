"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchProjectDashboardStats } from "@/features/projects/api/projects-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import { processChartData } from "../model/projects-model"

export function useProjectDashboardStats(projectId: string, timeRange: string = "90d") {
  const query = useQuery({
    queryKey: projectsQueryKeys.dashboardStats(projectId),
    queryFn: () => fetchProjectDashboardStats(projectId),
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
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: async () => {
      await query.refetch()
    },
  }
}
