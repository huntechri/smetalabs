import { Button } from "@/components/ui/button"
import type { DirectoryMaterial } from "@/features/directory-materials/types"
import { ImageIcon } from "lucide-react"
import { DirectoryMaterialsName } from "./directory-materials-name"
import { DirectoryMaterialsValue } from "./directory-materials-value"
import { DirectoryMaterialsMetricGroup } from "./directory-materials-metric-group"

export function DirectoryMaterialsRow({
  onEdit,
  row,
}: {
  onEdit: (row: DirectoryMaterial) => void
  row: DirectoryMaterial
}) {
  const priceLabel = `${row.price.toLocaleString("ru-RU")} ${row.currencyCode}`

  return (
    <div className="last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)_auto]">
        <div className="flex min-w-0 flex-col gap-3 p-2">
          <DirectoryMaterialsName value={row.name} />
          {row.code ? (
            <span className="text-xs text-muted-foreground">Код: {row.code}</span>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-1.5 p-1.5 md:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)]">
          <DirectoryMaterialsMetricGroup title="Ед. изм">
            <DirectoryMaterialsValue label="Ед." value={row.unit} />
          </DirectoryMaterialsMetricGroup>

          <DirectoryMaterialsMetricGroup title="Цена">
            <DirectoryMaterialsValue label="Цена" strong value={priceLabel} />
          </DirectoryMaterialsMetricGroup>

          <DirectoryMaterialsMetricGroup title="Изображение">
            {row.imageUrl ? (
              <img
                src={row.imageUrl}
                alt={row.name}
                className="h-14 w-14 rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-md border bg-muted">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </DirectoryMaterialsMetricGroup>

          <DirectoryMaterialsMetricGroup title="Категория">
            <DirectoryMaterialsValue label="Кат." value={row.category} />
            {row.supplierName ? (
              <DirectoryMaterialsValue label="Пост." value={row.supplierName} />
            ) : null}
          </DirectoryMaterialsMetricGroup>
        </div>

        <div className="flex items-start justify-end p-2">
          <Button
            onClick={() => onEdit(row)}
            size="sm"
            title="Редактировать материал"
            type="button"
            variant="outline"
          >
            Редактировать
          </Button>
        </div>
      </div>
    </div>
  )
}
