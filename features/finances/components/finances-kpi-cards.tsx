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
import { formatMoney } from "@/lib/formatters"
import type { FinanceSection } from "@/features/finances/types"
import { getSectionFactAmount } from "@/features/finances/lib/utils"

interface FinancesKpiCardsProps {
  sections: FinanceSection[]
}

export function FinancesKpiCards({ sections }: FinancesKpiCardsProps) {
  const contractTotal = sections.reduce((sum, s) => sum + s.planAmount, 0)
  const paidTotal = sections.reduce(
    (sum, s) => sum + getSectionFactAmount(s),
    0
  )
  const totalBalance = sections.reduce((sum, s) => sum + (s.balance ?? 0), 0)
  const deviationPercent =
    contractTotal > 0
      ? Math.round(((paidTotal - contractTotal) / contractTotal) * 100)
      : 0

  return (
    <div className="grid grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
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
          <CardTitle className="text-2xl font-semibold text-chart-2 tabular-nums @[250px]/card:text-3xl">
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
