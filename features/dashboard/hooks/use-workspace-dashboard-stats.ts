"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchWorkspaceDashboardStats } from "@/features/projects/api/projects-client"
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

  const processedChartData = useMemo(() => {
    return chartData.map((d) => ({
      ...d,
      outflow: -Math.abs(d.outflow),
    }))
  }, [chartData])

  const { minVal, maxVal, off } = useMemo(() => {
    if (!processedChartData.length) {
      return { minVal: 0, maxVal: 0, off: 0.5 }
    }
    const balances = processedChartData.map((d) => d.balance)
    const inflows = processedChartData.map((d) => d.inflow)
    const outflows = processedChartData.map((d) => d.outflow)

    const maxBal = Math.max(...balances, 0)
    const minBal = Math.min(...balances, 0)
    const maxIn = Math.max(...inflows, 0)
    const minOut = Math.min(...outflows, 0)

    const absoluteMax = Math.max(maxBal, maxIn)
    const absoluteMin = Math.min(minBal, minOut)

    const range = absoluteMax - absoluteMin
    const padding = range * 0.05
    const domainMax = absoluteMax + padding
    const domainMin = absoluteMin >= 0 ? 0 : absoluteMin - padding

    let gradientOffset = 0.5
    if (maxBal - minBal > 0) {
      gradientOffset = maxBal / (maxBal - minBal)
    }

    return { minVal: domainMin, maxVal: domainMax, off: gradientOffset }
  }, [processedChartData])

  return {
    stats,
    chartData,
    processedChartData,
    minVal,
    maxVal,
    off,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: async () => {
      await query.refetch()
    },
  }
}

