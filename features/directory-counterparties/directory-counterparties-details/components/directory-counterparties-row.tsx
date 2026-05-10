import type { DirectoryCounterpartyRow } from "@/types/directory-counterparty"
import { Badge } from "@/components/ui/badge"
import { DirectoryCounterpartiesName } from "./directory-counterparties-name"
import { DirectoryCounterpartiesValue } from "./directory-counterparties-value"
import { DirectoryCounterpartiesMetricGroup } from "./directory-counterparties-metric-group"

export function DirectoryCounterpartiesRow({ row }: { row: DirectoryCounterpartyRow }) {
  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <DirectoryCounterpartiesName value={row.name} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(160px,1fr)]">
          <DirectoryCounterpartiesMetricGroup title="Тип">
            <Badge
              variant={row.type === "customer" ? "default" : "secondary"}
              className="gap-1 rounded-md px-1.5 py-0.5 font-normal"
            >
              {row.type === "customer" ? "Заказчик" : "Подрядчик"}
            </Badge>
          </DirectoryCounterpartiesMetricGroup>

          <DirectoryCounterpartiesMetricGroup title="Статус">
            <Badge
              variant={row.legalStatus === "juridical" ? "default" : "secondary"}
              className="gap-1 rounded-md px-1.5 py-0.5 font-normal"
            >
              {row.legalStatus === "juridical" ? "Юр. лицо" : "Физ. лицо"}
            </Badge>
          </DirectoryCounterpartiesMetricGroup>

          <DirectoryCounterpartiesMetricGroup title="ИНН">
            <DirectoryCounterpartiesValue label="ИНН" value={row.inn} />
          </DirectoryCounterpartiesMetricGroup>

          <DirectoryCounterpartiesMetricGroup title="Телефон">
            <DirectoryCounterpartiesValue label="Тел." value={row.phone} />
          </DirectoryCounterpartiesMetricGroup>
        </div>
      </div>
    </div>
  )
}
