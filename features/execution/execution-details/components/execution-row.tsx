import type { ExecutionRow } from "@/types/execution"
import { getTotal } from "@/lib/calculations"
import { formatMoney } from "@/lib/formatters"
import { ExecutionName } from "./execution-name"
import { ExecutionUnit } from "./execution-unit"
import { EditableBadge } from "@/components/ui/editable-badge"
import { ExecutionMetricGroup } from "./execution-metric-group"

export function ExecutionRow({
  row,
  onUpdate,
}: {
  row: ExecutionRow
  onUpdate: (id: string, updates: Partial<ExecutionRow>) => void
}) {
  const planTotal = getTotal(row.planQuantity, row.planPrice)
  const factTotal = getTotal(row.factQuantity, row.factPrice)
  const deviationTotal = planTotal - factTotal

  return (
    <div className="grid gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(300px,1fr)_minmax(600px,1.3fr)]">
      <div className="flex flex-col sm:flex-row min-w-0 gap-3">
        <ExecutionName value={row.title} className="flex-1" />
        <ExecutionUnit unit={row.unit} className="w-full sm:w-[76px] shrink-0" />
      </div>

      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
        <ExecutionMetricGroup title="План">
          <EditableBadge
            label="Кол-во"
            value={row.planQuantity}
            onChange={(v) => onUpdate(row.id, { planQuantity: Number(v) })}
          />
          <EditableBadge
            label="Цена"
            value={row.planPrice}
            onChange={(v) => onUpdate(row.id, { planPrice: Number(v) })}
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
            label="Итого"
            strong
            value={deviationTotal}
            formatDisplay={(v) => formatMoney(Number(v))}
          />
        </ExecutionMetricGroup>
      </div>
    </div>
  )
}
