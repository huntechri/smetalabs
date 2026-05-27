"use client"

import {
  CurrencyRubIcon,
  CheckCircleIcon,
  ScalesIcon,
  ChartBarIcon,
} from "@phosphor-icons/react"

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/formatters"
import { useWorkspaceDashboardStats } from "./hooks/use-workspace-dashboard-stats"

export function SectionCards() {
  const { stats, loading, error, refetch } = useWorkspaceDashboardStats()

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="@container/card">
            <CardHeader className="gap-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-3.5 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-32 mt-1" />
            </CardHeader>
            <CardFooter className="mt-1.5">
              <Skeleton className="h-3.5 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-3">
        <Alert variant="destructive">
          <AlertTitle>Ошибка загрузки показателей воркспейса</AlertTitle>
          <AlertDescription>
            {error ?? "Не удалось получить финансовые показатели воркспейса"}
          </AlertDescription>
        </Alert>
        <Button className="w-fit" variant="outline" onClick={() => refetch()}>
          Повторить
        </Button>
      </div>
    )
  }

  const { contractTotal, paidTotal, spentTotal, totalBalance, deviationPercent } = stats

  return (
    <div className="grid grid-cols-2 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {/* Договор */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <CurrencyRubIcon className="size-3.5 text-muted-foreground" />
            Договор
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatMoney(contractTotal)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">По смете</div>
        </CardFooter>
      </Card>

      {/* Оплачено */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <CheckCircleIcon className="size-3.5 text-chart-2" />
            Оплачено
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-chart-2 @[250px]/card:text-3xl">
            {formatMoney(paidTotal)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Фактически оплачено</div>
        </CardFooter>
      </Card>

      {/* Общий баланс */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <ScalesIcon className="size-3.5 text-muted-foreground" />
            Баланс
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatMoney(totalBalance)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Текущий баланс</div>
        </CardFooter>
      </Card>

      {/* % Отклонения */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <ChartBarIcon className="size-3.5 text-muted-foreground" />
            Отклонение
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {deviationPercent > 0 ? `+${deviationPercent}` : deviationPercent}%
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Отклонение от плана</div>
        </CardFooter>
      </Card>
    </div>
  )
}

