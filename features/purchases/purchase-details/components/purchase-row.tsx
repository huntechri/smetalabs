import type { PurchaseRow } from "@/types/purchase"
import type { UpdatePurchaseInput } from "@/types/purchase"
import { getTotal } from "@/lib/calculations"
import { formatMoney } from "@/lib/formatters"
import { PurchaseName } from "./purchase-name"
import { PurchaseValue } from "./purchase-value"
import { PurchaseMetricGroup } from "./purchase-metric-group"
import { EditableBadge } from "@/components/ui/editable-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { DotsThreeIcon, TrashIcon } from "@phosphor-icons/react"

export function PurchaseRow({
  row,
  onUpdate,
  onArchive,
}: {
  row: PurchaseRow
  onUpdate?: (purchaseId: string, input: UpdatePurchaseInput) => Promise<void>
  onArchive?: (purchaseId: string) => Promise<void>
}) {
  const planTotal = getTotal(row.planQuantity, row.planPrice)
  const factQuantity = row.factQuantity ?? 0
  const factAvgPrice = row.factAvgPrice ?? 0
  const factTotal = getTotal(factQuantity, factAvgPrice)
  const deviationTotal = planTotal - factTotal

  const hasFact = row.factQuantity !== null && row.factQuantity > 0

  const canEdit = typeof onUpdate === "function"
  const canArchive = typeof onArchive === "function" && row.purchaseId !== null

  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <div className="flex items-start justify-between gap-2">
            <PurchaseName title={row.title} unit={row.unit} />
            {canArchive && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Действия с закупкой"
                  >
                    <DotsThreeIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onArchive(row.purchaseId!)}
                  >
                    <TrashIcon data-icon="inline-start" />
                    Удалить факт
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
          <PurchaseMetricGroup title="План">
            <PurchaseValue label="Кол-во" isMoney={false} value={row.planQuantity} />
            <PurchaseValue label="Цена" value={row.planPrice} />
            <PurchaseValue
              label="Итого"
              strong
              value={planTotal}
            />
          </PurchaseMetricGroup>

          <PurchaseMetricGroup title="Факт">
            {hasFact ? (
              <>
                <EditableBadge
                  label="Кол-во"
                  value={factQuantity}
                  onChange={
                    canEdit
                      ? (v) =>
                          onUpdate(row.purchaseId!, {
                            quantity: Number(v),
                          })
                      : undefined
                  }
                />
                <EditableBadge
                  label="Ср. цена"
                  value={factAvgPrice}
                  onChange={
                    canEdit
                      ? (v) =>
                          onUpdate(row.purchaseId!, {
                            price: Number(v),
                          })
                      : undefined
                  }
                  formatDisplay={(v) => formatMoney(Number(v))}
                />
                <EditableBadge
                  label="Итого"
                  strong
                  value={factTotal}
                  formatDisplay={(v) => formatMoney(Number(v))}
                />
              </>
            ) : (
              <>
                <EditableBadge
                  label="Кол-во"
                  value={0}
                  onChange={
                    canEdit && row.purchaseId
                      ? (v) =>
                          onUpdate(row.purchaseId!, {
                            quantity: Number(v),
                          })
                      : undefined
                  }
                />
                <EditableBadge
                  label="Ср. цена"
                  value={0}
                  onChange={
                    canEdit && row.purchaseId
                      ? (v) =>
                          onUpdate(row.purchaseId!, {
                            price: Number(v),
                          })
                      : undefined
                  }
                  formatDisplay={(v) => formatMoney(Number(v))}
                />
                <EditableBadge
                  label="Итого"
                  strong
                  value={0}
                  formatDisplay={(v) => formatMoney(Number(v))}
                />
              </>
            )}
          </PurchaseMetricGroup>

          <PurchaseMetricGroup title="Отклонение">
            <PurchaseValue
              label="Итого"
              deviation
              strong
              value={deviationTotal}
            />
          </PurchaseMetricGroup>
        </div>
      </div>
    </div>
  )
}
