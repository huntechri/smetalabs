import type { ExecutionRow } from "@/types/execution"
import { getTotal } from "@/lib/calculations"
import { formatMoney } from "@/lib/formatters"
import { ExecutionName } from "./execution-name"
import { ExecutionValue } from "./execution-value"
import { ExecutionMetricGroup } from "./execution-metric-group"

export function ExecutionRow({ row }: { row: ExecutionRow }) {
  const planTotal = getTotal(row.planQuantity, row.planPrice)
  const factTotal = getTotal(row.factQuantity, row.factPrice)
  const deviationTotal = planTotal - factTotal

  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 xl:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <ExecutionName value={row.title} unit={row.unit} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
          <ExecutionMetricGroup title="Plan">
            <ExecutionValue label="Qty" value={row.planQuantity} />
            <ExecutionValue
              label="Price"
              value={formatMoney(row.planPrice)}
            />
            <ExecutionValue
              label="Total"
              strong
              value={formatMoney(planTotal)}
            />
          </ExecutionMetricGroup>

          <ExecutionMetricGroup title="Actual">
            <ExecutionValue label="Qty" value={row.factQuantity} />
            <ExecutionValue
              label="Price"
              value={formatMoney(row.factPrice)}
            />
            <ExecutionValue
              label="Total"
              strong
              value={formatMoney(factTotal)}
            />
          </ExecutionMetricGroup>

          <ExecutionMetricGroup title="Deviation">
            <ExecutionValue
              label="Total"
              strong
              value={formatMoney(deviationTotal)}
            />
          </ExecutionMetricGroup>
        </div>
      </div>
    </div>
  )
}
