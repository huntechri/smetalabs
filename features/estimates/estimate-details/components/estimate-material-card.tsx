import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EditableBadge } from "@/components/ui/editable-badge"
import { Frame } from "@/components/ui/frame"
import { EstimateMaterialActions } from "@/features/estimates/estimate-details/components/estimate-material-actions"
import { EstimateMaterialName } from "@/features/estimates/estimate-details/components/estimate-material-name"
import { formatConsumption, formatMoney, parseDecimalInput } from "@/lib/formatters"
import type { ProjectEstimateContentMaterial } from "@/types/project-estimate-content"
import type { MaterialChangePayload } from "@/features/estimates/estimate-details/types"

export function EstimateMaterialCard({
  index,
  material,
  materialsCount,
  reorderDisabled,
  saving,
  workNumber,
  onArchive,
  onChange,
  onMoveNext,
  onMovePrevious,
}: {
  index: number
  material: ProjectEstimateContentMaterial
  materialsCount: number
  reorderDisabled: boolean
  saving: boolean
  workNumber: string
  onArchive: () => void
  onChange: (payload: MaterialChangePayload) => void
  onMoveNext: () => void
  onMovePrevious: () => void
}) {
  return (
    <Card size="sm" className="min-h-36 gap-3 bg-background shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Frame>
                <Badge variant="outline">
                  {workNumber}.{index + 1}
                </Badge>
              </Frame>
              <Frame>
                <Badge variant="secondary">{material.unitLabel}</Badge>
              </Frame>
            </div>
          </div>
          <EstimateMaterialActions
            disabled={saving}
            moveDownDisabled={reorderDisabled || index >= materialsCount - 1}
            moveUpDisabled={reorderDisabled || index === 0}
            title={material.title}
            onArchive={onArchive}
            onMoveDown={onMoveNext}
            onMoveUp={onMovePrevious}
          />
        </div>
        <EstimateMaterialName
          onChange={(title) => onChange({ title })}
          value={material.title}
        />
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <EditableBadge
            label="Кол-во"
            onChange={(value) =>
              onChange({ quantity: Number(value), changedField: "quantity" })
            }
            value={material.quantity}
          />
          <EditableBadge
            label="Расход"
            onChange={(value) =>
              onChange({
                consumption: parseDecimalInput(value),
                changedField: "consumption",
              })
            }
            formatDisplay={(value) =>
              material.consumption === null
                ? "—"
                : formatConsumption(Number(value))
            }
            value={material.consumption ?? ""}
          />
          <EditableBadge
            label="Цена"
            onChange={(value) =>
              onChange({ price: Number(value), changedField: "price" })
            }
            value={material.price}
          />
          <Badge
            variant="outline"
            className="gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums"
          >
            <span className="text-muted-foreground">Итого:</span>
            <span>{formatMoney(material.totalAmount)}</span>
          </Badge>
        </dl>
      </CardContent>
    </Card>
  )
}