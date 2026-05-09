import { useState } from "react"
import type { GlobalPurchaseRow } from "@/types/global-purchases"
import { getTotal } from "@/lib/calculations"
import { formatMoney } from "@/lib/formatters"
import { GlobalPurchasesName } from "./global-purchases-name"
import { EditableBadge } from "@/components/ui/editable-badge"
import { GlobalPurchasesMetricGroup } from "./global-purchases-metric-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { CalendarDots, CaretDown } from "@phosphor-icons/react"

function formatDate(date: Date | undefined): string {
  if (!date) return "Выбрать"
  const d = String(date.getDate()).padStart(2, "0")
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const y = date.getFullYear()
  return `${d}.${m}.${y}`
}

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

  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedStatus, setSelectedStatus] = useState("Заказано")
  const [selectedObject, setSelectedObject] = useState("Нет")

  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <GlobalPurchasesName value={row.title} unit={row.unit} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[1fr_minmax(200px,0.5fr)_minmax(140px,0.35fr)]">
          <GlobalPurchasesMetricGroup title="Факт">
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
              label="Сумма"
              strong
              value={factTotal}
              formatDisplay={(v) => formatMoney(Number(v))}
            />
          </GlobalPurchasesMetricGroup>

          <GlobalPurchasesMetricGroup title="Отклонение">
            <Popover>
              <PopoverTrigger asChild>
                <Badge
                  variant="outline"
                  className="gap-1 rounded-md px-1.5 py-0.5 font-normal cursor-pointer hover:bg-muted"
                >
                  <CalendarDots className="size-2.5" />
                  <span className="text-muted-foreground">Дата:</span>
                  <span>{formatDate(selectedDate)}</span>
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                />
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant="outline"
                  className="gap-1 rounded-md px-1.5 py-0.5 font-normal cursor-pointer hover:bg-muted"
                >
                  <span className="text-muted-foreground">Статус:</span>
                  <span>{selectedStatus}</span>
                  <CaretDown className="size-2.5" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {["Заказано", "В пути", "Доставлено", "Отменено"].map(
                  (status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                    >
                      {status}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </GlobalPurchasesMetricGroup>

          <GlobalPurchasesMetricGroup title="Объект">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant="outline"
                  className="gap-1 rounded-md px-1.5 py-0.5 font-normal cursor-pointer hover:bg-muted"
                >
                  <span className="text-muted-foreground">Объект:</span>
                  <span>{selectedObject}</span>
                  <CaretDown className="size-2.5" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {["Объект А", "Объект Б", "Объект В", "Нет"].map(
                  (obj) => (
                    <DropdownMenuItem
                      key={obj}
                      onClick={() => setSelectedObject(obj)}
                    >
                      {obj}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </GlobalPurchasesMetricGroup>
        </div>
      </div>
    </div>
  )
}
