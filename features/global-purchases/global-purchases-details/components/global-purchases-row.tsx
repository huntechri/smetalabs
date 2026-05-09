import type { GlobalPurchaseRow } from "@/types/global-purchases"
import { getTotal } from "@/lib/calculations"
import { formatMoney } from "@/lib/formatters"
import { GlobalPurchasesName } from "./global-purchases-name"
import { EditableBadge } from "@/components/ui/editable-badge"
import { GlobalPurchasesMetricGroup } from "./global-purchases-metric-group"
import { Image as ImageIcon } from "@phosphor-icons/react"

export function GlobalPurchasesRow({
  row,
  onUpdate,
}: {
  row: GlobalPurchaseRow
  onUpdate: (id: string, updates: Partial<GlobalPurchaseRow>) => void
}) {
  const planTotal = getTotal(row.planQuantity, row.planPrice)
  const factTotal = getTotal(row.factQuantity, row.factPrice)
  const deviationTotal = planTotal - factTotal

  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <GlobalPurchasesName value={row.title} unit={row.unit} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
          <GlobalPurchasesMetricGroup title="Plan">
            <div className="size-14 rounded-md border border-dashed border-slate-300 bg-muted/30 flex items-center justify-center shrink-0">
              <ImageIcon className="size-4 text-muted-foreground" />
            </div>
          </GlobalPurchasesMetricGroup>

          <GlobalPurchasesMetricGroup title="Actual">
            <EditableBadge
              label="Qty"
              value={row.factQuantity}
              onChange={(v) =>
                onUpdate(row.id, { factQuantity: Number(v) })
              }
            />
            <EditableBadge
              label="Price"
              value={row.factPrice}
              onChange={(v) =>
                onUpdate(row.id, { factPrice: Number(v) })
              }
              formatDisplay={(v) => formatMoney(Number(v))}
            />
            <EditableBadge
              label="Total"
              strong
              value={factTotal}
              formatDisplay={(v) => formatMoney(Number(v))}
            />
          </GlobalPurchasesMetricGroup>

          <GlobalPurchasesMetricGroup title="Deviation">
            <EditableBadge
              label="Total"
              strong
              value={deviationTotal}
              formatDisplay={(v) => formatMoney(Number(v))}
            />
          </GlobalPurchasesMetricGroup>
        </div>
      </div>
    </div>
  )
}
