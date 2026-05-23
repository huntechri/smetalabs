"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
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

const chartData = [
  { date: "2024-04-01", planned: 222, actual: 150 },
  { date: "2024-04-15", planned: 300, actual: 210 },
  { date: "2024-05-01", planned: 280, actual: 260 },
  { date: "2024-05-15", planned: 420, actual: 360 },
  { date: "2024-06-01", planned: 390, actual: 340 },
  { date: "2024-06-15", planned: 480, actual: 430 },
  { date: "2024-06-30", planned: 520, actual: 470 },
]

const chartConfig = {
  planned: {
    label: "План",
    color: "var(--primary)",
  },
  actual: {
    label: "Факт",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d")
  }, [isMobile])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Динамика проекта</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Заготовка графика для будущих проектных показателей
          </span>
          <span className="@[540px]/card:hidden">Проектные показатели</span>
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
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-actual)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-actual)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-planned)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-planned)"
                  stopOpacity={0.1}
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
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="actual"
              type="natural"
              fill="url(#fillActual)"
              stroke="var(--color-actual)"
              stackId="a"
            />
            <Area
              dataKey="planned"
              type="natural"
              fill="url(#fillPlanned)"
              stroke="var(--color-planned)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
