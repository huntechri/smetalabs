import type { DirectoryWorkRow } from "@/types/directory-work"
import { DirectoryWorksName } from "./directory-works-name"
import { DirectoryWorksValue } from "./directory-works-value"
import { DirectoryWorksMetricGroup } from "./directory-works-metric-group"

export function DirectoryWorksRow({ row }: { row: DirectoryWorkRow }) {
  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <DirectoryWorksName value={row.title} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
          <DirectoryWorksMetricGroup title="Ед. изм">
            <DirectoryWorksValue label="Ед." value={row.unit} />
          </DirectoryWorksMetricGroup>

          <DirectoryWorksMetricGroup title="Расценка">
            <DirectoryWorksValue
              label="Цена"
              strong
              value={`${row.rate.toLocaleString("ru-RU")} ₽`}
            />
          </DirectoryWorksMetricGroup>

          <DirectoryWorksMetricGroup title="Категория">
            <DirectoryWorksValue label="Кат." value={row.category} />
          </DirectoryWorksMetricGroup>
        </div>
      </div>
    </div>
  )
}
