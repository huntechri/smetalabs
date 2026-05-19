import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EditableBadge } from "@/components/ui/editable-badge"
import { Textarea } from "@/components/ui/textarea"
import { formatConsumption, formatMoney, parseDecimalInput } from "@/lib/formatters"
import type { ProjectEstimateContentMaterial } from "@/types/project-estimate-content"
import type { MaterialChangePayload } from "@/features/estimates/estimate-details/types"

export function EstimateMaterialCard({
  material,
  saving,
  onArchive,
  onChange,
}: {
  material: ProjectEstimateContentMaterial
  saving: boolean
  onArchive: () => void
  onChange: (payload: MaterialChangePayload) => void
}) {
  return (
    <div className="rounded-md border border-dashed bg-background p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{material.number}</Badge>
          {material.code ? <Badge variant="outline">{material.code}</Badge> : null}
          <Badge variant="secondary">{material.unitLabel}</Badge>
        </div>
        <Button disabled={saving} size="sm" variant="destructive" onClick={onArchive}>
          Удалить
        </Button>
      </div>
      <Textarea
        disabled={saving}
        defaultValue={material.title}
        onBlur={(event) => {
          const title = event.currentTarget.value.trim()
          if (title && title !== material.title) onChange({ title })
        }}
      />
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <EditableBadge
          label="Кол-во"
          value={material.quantity}
          onChange={(value) =>
            onChange({ quantity: Number(value), changedField: "quantity" })
          }
        />
        <EditableBadge
          label="Расход"
          value={material.consumption ?? ""}
          formatDisplay={() =>
            material.consumption === null
              ? "—"
              : formatConsumption(material.consumption)
          }
          onChange={(value) =>
            onChange({
              consumption: parseDecimalInput(value),
              changedField: "consumption",
            })
          }
        />
        <EditableBadge
          label="Цена"
          value={material.price}
          onChange={(value) =>
            onChange({ price: Number(value), changedField: "price" })
          }
        />
        <Badge variant="outline" className="justify-center">
          {formatMoney(material.totalAmount)}
        </Badge>
      </div>
    </div>
  )
}
