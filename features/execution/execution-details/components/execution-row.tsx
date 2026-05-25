import type { ProjectEstimateContentWork } from "@/types/project-estimate-content"
import { formatMoney } from "@/lib/formatters"
import { ExecutionName } from "./execution-name"
import { ExecutionUnit } from "./execution-unit"
import { EditableBadge } from "@/components/ui/editable-badge"
import { ExecutionMetricGroup } from "./execution-metric-group"
import { cn } from "@/lib/utils"

export function ExecutionRow({
  row,
  onUpdate,
}: {
  row: ProjectEstimateContentWork
  onUpdate: (id: string, updates: { factQuantity?: number; factPrice?: number }) => void
}) {
  const planTotal = row.totalAmount
  const factTotal = row.factTotalAmount
  const deviationTotal = planTotal - factTotal

  const deviationClass = (() => {
    if (deviationTotal > 0) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
    }
    if (deviationTotal < 0) {
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
    }
    return "border-transparent text-muted-foreground"
  })()

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(300px,1fr)_minmax(600px,1.3fr)]">
      <div className="flex flex-col sm:flex-row min-w-0 gap-3">
        <ExecutionName value={row.title} className="flex-1" />
        <ExecutionUnit unit={row.unitLabel} className="w-full sm:w-[76px] shrink-0" />
      </div>

      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
        <ExecutionMetricGroup title="План">
          <EditableBadge
            label="Кол-во"
            value={row.quantity}
          />
          <EditableBadge
            label="Цена"
            value={row.price}
            formatDisplay={(v) => formatMoney(Number(v))}
          />
          <EditableBadge
            label="Итого"
            strong
            value={planTotal}
            formatDisplay={(v) => formatMoney(Number(v))}
          />
        </ExecutionMetricGroup>

        <ExecutionMetricGroup title="Факт">
          <EditableBadge
            label="Кол-во"
            value={row.factQuantity}
            onChange={(v) => onUpdate(row.id, { factQuantity: Number(v) })}
          />
          <EditableBadge
            label="Цена"
            value={row.factPrice}
            onChange={(v) => onUpdate(row.id, { factPrice: Number(v) })}
            formatDisplay={(v) => formatMoney(Number(v))}
          />
          <EditableBadge
            label="Итого"
            strong
            value={factTotal}
            formatDisplay={(v) => formatMoney(Number(v))}
          />
        </ExecutionMetricGroup>

        <ExecutionMetricGroup title="Отклонение">
          <EditableBadge
            className={cn("border transition-colors", deviationClass)}
            label="Итого"
            strong
            value={deviationTotal}
            formatDisplay={(v) => {
              const num = Number(v)
              const sign = num > 0 ? "+" : ""
              return `${sign}${formatMoney(num)}`
            }}
          />
        </ExecutionMetricGroup>
      </div>
    </div>
  )
}
