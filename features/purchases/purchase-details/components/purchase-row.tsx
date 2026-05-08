import type { PurchaseRow } from "@/types/purchase"
import { getTotal } from "@/lib/calculations"
import { formatMoney } from "@/lib/formatters"
import { PurchaseName } from "./purchase-name"
import { PurchaseValue } from "./purchase-value"
import { PurchaseMetricGroup } from "./purchase-metric-group"

export function PurchaseRow({ row }: { row: PurchaseRow }) {
  const planTotal = getTotal(row.planQuantity, row.planPrice)
  const factTotal = getTotal(row.factQuantity, row.factPrice)
  const deviationTotal = planTotal - factTotal

  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 xl:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <PurchaseName value={row.title} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
          <PurchaseMetricGroup title="Plan">
            <PurchaseValue label="Qty" value={row.planQuantity} />
            <PurchaseValue
              label="Price"
              value={formatMoney(row.planPrice)}
            />
            <PurchaseValue
              label="Total"
              strong
              value={formatMoney(planTotal)}
            />
          </PurchaseMetricGroup>

          <PurchaseMetricGroup title="Actual">
            <PurchaseValue label="Qty" value={row.factQuantity} />
            <PurchaseValue
              label="Price"
              value={formatMoney(row.factPrice)}
            />
            <PurchaseValue
              label="Total"
              strong
              value={formatMoney(factTotal)}
            />
          </PurchaseMetricGroup>

          <PurchaseMetricGroup title="Deviation">
            <PurchaseValue
              label="Total"
              strong
              value={formatMoney(deviationTotal)}
            />
          </PurchaseMetricGroup>
        </div>
      </div>
    </div>
  )
}
