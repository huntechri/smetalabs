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

  const { chartData, loading, error, refetch } = useProjectDashboardStats(projectId, timeRange)

  const balances = React.useMemo(() => chartData.map((d) => d.balance), [chartData])
  
  const { maxBalance, minBalance, off } = React.useMemo(() => {
    const max = balances.length ? Math.max(...balances, 0) : 0
    const min = balances.length ? Math.min(...balances, 0) : 0
    let gradientOffset = 0.5
    if (max - min > 0) {
      gradientOffset = max / (max - min)
    }
    return { maxBalance: max, minBalance: min, off: gradientOffset }
  }, [balances])

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
        <CardContent className="h-[280px] flex items-center justify-center">
          <Skeleton className="w-full h-full rounded" />
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
            <AlertDescription>
              {error}
            </AlertDescription>
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
          <CardDescription>Поступления, расходы и баланс во времени</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] flex flex-col items-center justify-center text-center text-muted-foreground p-6 border border-dashed rounded-lg m-6">
          <p className="text-sm font-medium">Нет транзакций для построения графика</p>
          <p className="text-xs max-w-sm mt-1">
            Для отображения динамики баланса и затрат проекта добавьте сметы, платежи или закупки.
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
            <ToggleGroupItem value="90d">Последние 3 месяца</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 дней</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 дней</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Выбрать период"
            >
              <SelectValue placeholder="Последние 3 месяца" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Последние 3 месяца
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
          <ComposedChart data={chartData} margin={{ left: -10, right: 10 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset={off} stopColor="var(--color-inflow)" stopOpacity={0.2} />
                <stop offset={off} stopColor="var(--color-outflow)" stopOpacity={0.2} />
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
              yAxisId="balance"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatYAxisTick}
              className="text-muted-foreground"
            />
            <YAxis
              yAxisId="bars"
              orientation="right"
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
                        className="shrink-0 h-2.5 w-2.5 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex flex-1 justify-between items-center gap-4 w-full">
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatMoney(Number(value))}
                        </span>
                      </div>
                    </>
                  )}
                />
              }
            />
            <Area
              yAxisId="balance"
              type="monotone"
              dataKey="balance"
              stroke="var(--color-balance)"
              strokeWidth={2}
              fill="url(#balanceGradient)"
              name="balance"
            />
            <Bar
              yAxisId="bars"
              dataKey="inflow"
              fill="var(--color-inflow)"
              name="inflow"
              radius={[2, 2, 0, 0]}
              opacity={0.7}
            />
            <Bar
              yAxisId="bars"
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

