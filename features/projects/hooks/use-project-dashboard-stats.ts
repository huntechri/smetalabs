"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchProjectDashboardStats } from "@/features/projects/api/projects-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"

export type ChartPoint = {
  date: string
  inflow: number
  outflow: number
  balance: number
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function processChartData(
  transactions: { type: "payment" | "purchase"; amount: number; date: string }[],
  timeRange: string
): ChartPoint[] {
  if (!transactions || transactions.length === 0) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let startDate = new Date(today)
  if (timeRange === "7d") {
    startDate.setDate(today.getDate() - 7)
  } else if (timeRange === "30d") {
    startDate.setDate(today.getDate() - 30)
  } else if (timeRange === "90d") {
    startDate.setDate(today.getDate() - 90)
  } else {
    // Default to the first transaction date
    const firstTx = transactions[0]
    if (firstTx) {
      const [y, m, d] = firstTx.date.split("-").map(Number)
      startDate = new Date(y, m - 1, d)
    } else {
      startDate.setDate(today.getDate() - 30)
    }
  }
  startDate.setHours(0, 0, 0, 0)

  // 1. Calculate starting totals (before startDate)
  let cumulativeInflow = 0
  let cumulativeOutflow = 0

  transactions.forEach((t) => {
    const tDate = parseDateLocal(t.date)
    if (tDate.getTime() < startDate.getTime()) {
      if (t.type === "payment") {
        cumulativeInflow += t.amount
      } else {
        cumulativeOutflow += t.amount
      }
    }
  })

  // 2. Generate all dates in the range (local time strings)
  const dates: string[] = []
  const current = new Date(startDate.getTime())
  const todayStr = formatDateLocal(today)
  
  let safety = 0
  if (startDate.getTime() <= today.getTime()) {
    while (safety < 1000) {
      const curStr = formatDateLocal(current)
      dates.push(curStr)
      if (curStr === todayStr) break
      current.setDate(current.getDate() + 1)
      safety++
    }
  } else {
    dates.push(todayStr)
  }

  // 3. Map daily transactions
  const dailyTransactions = new Map<string, { inflow: number; outflow: number }>()
  dates.forEach((d) => dailyTransactions.set(d, { inflow: 0, outflow: 0 }))

  transactions.forEach((t) => {
    const daily = dailyTransactions.get(t.date)
    if (daily) {
      if (t.type === "payment") {
        daily.inflow += t.amount
      } else {
        daily.outflow += t.amount
      }
    }
  })

  // 4. Build data points: inflow/outflow are daily, balance is cumulative
  const points = dates.map((d) => {
    const daily = dailyTransactions.get(d)!
    cumulativeInflow += daily.inflow
    cumulativeOutflow += daily.outflow
    return {
      date: d,
      inflow: Math.round(daily.inflow * 100) / 100,
      outflow: Math.round(daily.outflow * 100) / 100,
      balance: Math.round((cumulativeInflow - cumulativeOutflow) * 100) / 100,
    }
  })

  return points
}

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
