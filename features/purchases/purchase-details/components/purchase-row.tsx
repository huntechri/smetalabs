import type { PurchaseRow } from "@/types/purchase"
import { PurchaseName } from "./purchase-name"
import { PurchaseValue } from "./purchase-value"
import { PurchaseMetricGroup } from "./purchase-metric-group"

export function PurchaseRow({ row }: { row: PurchaseRow }) {
  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <PurchaseName title={row.title} unit={row.unit} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
          <PurchaseMetricGroup title="План">
            <PurchaseValue label="Кол-во" value={row.planQuantity} />
            <PurchaseValue label="Цена" value={row.planPrice} />
            <PurchaseValue
              label="Итого"
              strong
              value={row.planTotal}
            />
          </PurchaseMetricGroup>

          <PurchaseMetricGroup title="Факт">
            <PurchaseValue label="Кол-во" value={row.factQuantity} />
            <PurchaseValue label="Ср. цена" value={row.factAvgPrice} />
            <PurchaseValue
              label="Итого"
              strong
              value={row.factTotal}
            />
          </PurchaseMetricGroup>

          <PurchaseMetricGroup title="Отклонение">
            <PurchaseValue
              label="Итого"
              deviation
              strong
              value={row.deviationTotal}
            />
          </PurchaseMetricGroup>
        </div>
      </div>
    </div>
  )
}
