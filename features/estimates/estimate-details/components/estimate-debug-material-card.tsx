import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EditableBadge } from "@/components/ui/editable-badge"
import { Frame } from "@/components/ui/frame"
import { EstimateMaterialActions } from "@/features/estimates/estimate-details/components/estimate-material-actions"
import { EstimateMaterialName } from "@/features/estimates/estimate-details/components/estimate-material-name"
import { getTotal } from "@/lib/calculations"
import { formatConsumption, formatMoney, parseDecimalInput } from "@/lib/formatters"
import type { Material } from "@/types/estimate"

export function EstimateDebugMaterialCard({
  index,
  material,
  workNumber,
  onUpdate,
}: {
  index: number
  material: Material
  workNumber: string
  onUpdate: (id: string, updates: Partial<Material>) => void
}) {
  return (
    <Card
      size="sm"
      className="min-h-36 gap-3 border border-dashed border-blue-500 bg-background shadow-none"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Frame className="border-blue-300">
                <Badge variant="outline">
                  {workNumber}.{index + 1}
                </Badge>
              </Frame>
              <Frame className="border-blue-300">
                <Badge variant="secondary">{material.unit}</Badge>
              </Frame>
            </div>
          </div>
          <EstimateMaterialActions title={material.title} />
        </div>
        <EstimateMaterialName
          onChange={(value) => onUpdate(material.id, { title: value })}
          value={material.title}
        />
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <EditableBadge
            label="Кол-во"
            onChange={(value) =>
              onUpdate(material.id, { quantity: Number(value) })
            }
            value={material.quantity}
          />
          <EditableBadge
            label="Расход"
            onChange={(value) =>
              onUpdate(material.id, { waste: parseDecimalInput(value) })
            }
            formatDisplay={(value) => formatConsumption(Number(value))}
            value={material.waste}
          />
          <EditableBadge
            label="Цена"
            onChange={(value) => onUpdate(material.id, { price: Number(value) })}
            value={material.price}
          />
          <Badge
            variant="outline"
            className="gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums"
          >
            <span className="text-muted-foreground">Итого:</span>
            <span>{formatMoney(getTotal(material.quantity, material.price))}</span>
          </Badge>
        </dl>
      </CardContent>
    </Card>
  )
}
