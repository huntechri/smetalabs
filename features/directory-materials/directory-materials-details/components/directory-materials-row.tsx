import type { DirectoryMaterialRow } from "@/types/directory-material"
import { DirectoryMaterialsName } from "./directory-materials-name"
import { DirectoryMaterialsValue } from "./directory-materials-value"
import { DirectoryMaterialsMetricGroup } from "./directory-materials-metric-group"

export function DirectoryMaterialsRow({ row }: { row: DirectoryMaterialRow }) {
  return (
    <div className="border-b border-dashed border-green-500 last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed border-green-300 p-2">
          <DirectoryMaterialsName value={row.title} />
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-dashed border-green-400 p-1.5 md:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)]">
          <DirectoryMaterialsMetricGroup title="Ед. изм">
            <DirectoryMaterialsValue label="Ед." value={row.unit} />
          </DirectoryMaterialsMetricGroup>

          <DirectoryMaterialsMetricGroup title="Цена">
            <DirectoryMaterialsValue
              label="Цена"
              strong
              value={`${row.price.toLocaleString("ru-RU")} ₽`}
            />
          </DirectoryMaterialsMetricGroup>

          <DirectoryMaterialsMetricGroup title="Поставщик">
            <DirectoryMaterialsValue label="Пост." value={row.supplier} />
          </DirectoryMaterialsMetricGroup>

          <DirectoryMaterialsMetricGroup title="Категория">
            <DirectoryMaterialsValue label="Кат." value={row.category} />
          </DirectoryMaterialsMetricGroup>
        </div>
      </div>
    </div>
  )
}
