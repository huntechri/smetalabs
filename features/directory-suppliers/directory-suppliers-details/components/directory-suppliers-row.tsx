import type { DirectorySupplierRow } from "@/types/directory-supplier"
import { Badge } from "@/components/ui/badge"
import { DirectorySuppliersName } from "./directory-suppliers-name"
import { DirectorySuppliersValue } from "./directory-suppliers-value"
import { DirectorySuppliersMetricGroup } from "./directory-suppliers-metric-group"

export function DirectorySuppliersRow({ row }: { row: DirectorySupplierRow }) {
  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <DirectorySuppliersName value={row.name} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(160px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(160px,1fr)]">
          <DirectorySuppliersMetricGroup title="Цвет">
            <div className="flex items-center gap-1.5">
              <div
                className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/30"
                style={{ backgroundColor: row.color }}
              />
              <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums">
                <span>{row.color}</span>
              </Badge>
            </div>
          </DirectorySuppliersMetricGroup>

          <DirectorySuppliersMetricGroup title="Статус">
            <Badge
              variant={row.status === "juridical" ? "default" : "secondary"}
              className="gap-1 rounded-md px-1.5 py-0.5 font-normal"
            >
              {row.status === "juridical" ? "Юр. лицо" : "Физ. лицо"}
            </Badge>
          </DirectorySuppliersMetricGroup>

          <DirectorySuppliersMetricGroup title="ИНН">
            <DirectorySuppliersValue label="ИНН" value={row.inn} />
          </DirectorySuppliersMetricGroup>

          <DirectorySuppliersMetricGroup title="Телефон">
            <DirectorySuppliersValue label="Тел." value={row.phone} />
          </DirectorySuppliersMetricGroup>
        </div>
      </div>
    </div>
  )
}
