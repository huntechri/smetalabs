"use client"

import { useMemo } from "react"
import {
  CurrencyRubIcon,
  CheckCircleIcon,
  ScalesIcon,
  ChartBarIcon,
} from "@phosphor-icons/react"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatMoney } from "@/lib/formatters"
import type { FinanceSection } from "@/features/finances/__mocks__/finances"
import { getSectionFactAmount } from "@/features/finances/__mocks__/finances"

interface FinancesKpiCardsProps {
  sections: FinanceSection[]
}

export function FinancesKpiCards({ sections }: FinancesKpiCardsProps) {
  const metrics = useMemo(() => {
    const contractTotal = sections.reduce(
      (sum, s) => sum + s.planAmount,
      0
    )
    const paidTotal = sections.reduce(
      (sum, s) => sum + getSectionFactAmount(s),
      0
    )
    const remainder = contractTotal - paidTotal
    const progressPercent =
      contractTotal > 0
        ? Math.round((paidTotal / contractTotal) * 100)
        : 0

    return { contractTotal, paidTotal, remainder, progressPercent }
  }, [sections])

  return (
    <div className="grid grid-cols-2 gap-4 @5xl/main:grid-cols-4">
      {/* Договор */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <CurrencyRubIcon className="size-3.5 text-muted-foreground" />
            Договор
          </CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {formatMoney(metrics.contractTotal)}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Оплачено */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <CheckCircleIcon className="size-3.5 text-chart-2" />
            Оплачено
          </CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums text-chart-2 @[250px]/card:text-2xl">
            {formatMoney(metrics.paidTotal)}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Остаток */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <ScalesIcon className="size-3.5 text-muted-foreground" />
            Остаток
          </CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {formatMoney(metrics.remainder)}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* % готовности */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <ChartBarIcon className="size-3.5 text-muted-foreground" />
            Готовность
          </CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {metrics.progressPercent}%
          </CardTitle>
        </CardHeader>
        <div className="mx-4 mb-4 -mt-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${metrics.progressPercent}%` }}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
