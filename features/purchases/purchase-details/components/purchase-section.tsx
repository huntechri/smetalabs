import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type PurchaseRow = {
  id: string
  title: string
  planQuantity: number
  planPrice: number
  factQuantity: number
  factPrice: number
}

const purchaseRows: PurchaseRow[] = [
  {
    id: "purchase-1",
    title:
      "Автоматический выключатель EKF PROxima BA-45-2000 3P 1000A 80 кА 690 В",
    planQuantity: 0,
    planPrice: 0,
    factQuantity: 1,
    factPrice: 355784,
  },
]

const currency = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "RUB",
})

function formatMoney(value: number) {
  return currency.format(value).replace("RUB", "₽")
}

function getTotal(quantity: number, price: number) {
  return quantity * price
}

export function PurchaseSection() {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {purchaseRows.map((row) => {
          const planTotal = getTotal(row.planQuantity, row.planPrice)
          const factTotal = getTotal(row.factQuantity, row.factPrice)
          const deviationTotal = planTotal - factTotal

          return (
            <div
              className="border-b border-dashed border-green-500 last:border-b-0"
              key={row.id}
            >
              <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 xl:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
                <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
                  <PurchaseName value={row.title} />
                </div>

                <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
                  <PurchaseMetricGroup title="План">
                    <PurchaseValue label="Кол-во" value={row.planQuantity} />
                    <PurchaseValue
                      label="Цена"
                      value={formatMoney(row.planPrice)}
                    />
                    <PurchaseValue
                      label="Итого"
                      strong
                      value={formatMoney(planTotal)}
                    />
                  </PurchaseMetricGroup>

                  <PurchaseMetricGroup title="Факт">
                    <PurchaseValue label="Кол-во" value={row.factQuantity} />
                    <PurchaseValue
                      label="Цена"
                      value={formatMoney(row.factPrice)}
                    />
                    <PurchaseValue
                      label="Итого"
                      strong
                      value={formatMoney(factTotal)}
                    />
                  </PurchaseMetricGroup>

                  <PurchaseMetricGroup title="Откл.">
                    <PurchaseValue
                      label="Сумма"
                      strong
                      value={formatMoney(deviationTotal)}
                    />
                  </PurchaseMetricGroup>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function PurchaseMetricGroup({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-dashed border-emerald-400 p-1.5">
      <div className="text-xs font-semibold text-muted-foreground uppercase">
        {title}
      </div>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  )
}

function PurchaseValue({
  className,
  label,
  strong = false,
  value,
}: {
  className?: string
  label: string
  strong?: boolean
  value: number | string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums",
        strong && "font-semibold",
        className
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
    </Badge>
  )
}

function PurchaseName({ value }: { value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-dashed border-green-300 p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Наименование
      </span>
      <div className="break-words text-sm font-medium leading-snug">
        {value}
      </div>
    </div>
  )
}
