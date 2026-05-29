"use client"

import * as React from "react"
import { ComposedChart, Area, Bar, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { useProjectDashboardStats } from "@/features/projects/hooks/use-project-dashboard-stats"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/formatters"

const chartConfig = {
  inflow: {
    label: "Приход",
    color: "var(--chart-2)",
  },
  outflow: {
    label: "Расход",
    color: "var(--destructive)",
  },
  balance: {
    label: "Баланс",
    color: "var(--primary)",
  },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
  projectId: string
}

export function ChartAreaInteractive({ projectId }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d")
  }, [isMobile])

  const { chartData, loading, error, refetch } = useProjectDashboardStats(
    projectId,
    timeRange
  )

  const processedChartData = React.useMemo(() => {
    return chartData.map((d) => ({
      ...d,
      outflow: -Math.abs(d.outflow),
    }))
  }, [chartData])

  const { minVal, maxVal, off } = React.useMemo(() => {
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

  const formatYAxisTick = (value: number) => {
    if (value === 0) return "0"
    if (Math.abs(value) >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)} млн`
    }
    if (Math.abs(value) >= 1_000) {
      return `${(value / 1_000).toFixed(0)} тыс`
    }
    return String(value)
  }

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </CardHeader>
        <CardContent className="flex h-[280px] items-center justify-center">
          <Skeleton className="h-full w-full rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="@container/card">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTitle>Ошибка загрузки графика</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button className="mt-3" variant="outline" onClick={() => refetch()}>
            Повторить
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Динамика проекта</CardTitle>
          <CardDescription>
            Поступления, расходы и баланс во времени
          </CardDescription>
        </CardHeader>
        <CardContent className="m-6 flex h-[280px] flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <p className="text-sm font-medium">
            Нет транзакций для построения графика
          </p>
          <p className="mt-1 max-w-sm text-xs">
            Для отображения динамики баланса и затрат проекта добавьте сметы,
            платежи или закупки.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Динамика проекта</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Ежедневные поступления и расходы, накопительный баланс проекта
          </span>
          <span className="@[540px]/card:hidden">Денежный поток по дням</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">3 месяца</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 дней</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 дней</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Выбрать период"
            >
              <SelectValue placeholder="3 месяца" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                3 месяца
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 дней
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 дней
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[280px] w-full"
        >
          <ComposedChart
            key={`${minVal}-${maxVal}`}
            data={processedChartData}
            margin={{ left: 12, right: 12, top: 5, bottom: 5 }}
          >
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-inflow)"
                  stopOpacity={0.2}
                />
                <stop
                  offset={`${off * 100}%`}
                  stopColor="var(--color-inflow)"
                  stopOpacity={0.2}
                />
                <stop
                  offset={`${off * 100}%`}
                  stopColor="var(--color-outflow)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-outflow)"
                  stopOpacity={0.2}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("ru-RU", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis
              key={`${minVal}-${maxVal}`}
              domain={[minVal, maxVal]}
              width={80}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatYAxisTick}
              className="text-muted-foreground"
            />
            <ChartTooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name, item) => (
                    <>
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex w-full flex-1 items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]
                            ?.label ?? name}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatMoney(
                            name === "outflow"
                              ? Math.abs(Number(value))
                              : Number(value)
                          )}
                        </span>
                      </div>
                    </>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--color-balance)"
              strokeWidth={2}
              fill="url(#balanceGradient)"
              name="balance"
              baseValue={0}
            />
            <Bar
              dataKey="inflow"
              fill="var(--color-inflow)"
              name="inflow"
              radius={[2, 2, 0, 0]}
              opacity={0.7}
            />
            <Bar
              dataKey="outflow"
              fill="var(--color-outflow)"
              name="outflow"
              radius={[2, 2, 0, 0]}
              opacity={0.7}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
