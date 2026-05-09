import type { ExecutionRow } from "@/types/execution"
import { getTotal } from "@/lib/calculations"
import { formatMoney } from "@/lib/formatters"
import { ExecutionName } from "./execution-name"
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
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <ExecutionName value={row.title} unit={row.unit} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
          <ExecutionMetricGroup title="План">
            <EditableBadge
              label="Кол-во"
              value={row.planQuantity}
              onChange={(v) =>
                onUpdate(row.id, { planQuantity: Number(v) })
              }
            />
            <EditableBadge
              label="Цена"
              value={row.planPrice}
              onChange={(v) =>
                onUpdate(row.id, { planPrice: Number(v) })
              }
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
              onChange={(v) =>
                onUpdate(row.id, { factQuantity: Number(v) })
              }
            />
            <EditableBadge
              label="Цена"
              value={row.factPrice}
              onChange={(v) =>
                onUpdate(row.id, { factPrice: Number(v) })
              }
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
    </div>
  )
}
