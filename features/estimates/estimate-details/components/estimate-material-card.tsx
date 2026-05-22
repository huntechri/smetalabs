"use client"
 
import { useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EditableBadge } from "@/components/ui/editable-badge"
import { Frame } from "@/components/ui/frame"
import { EstimateMaterialActions } from "@/features/estimates/estimate-details/components/estimate-material-actions"
import { EstimateMaterialName } from "@/features/estimates/estimate-details/components/estimate-material-name"
import { useEstimateEditorContext } from "@/features/estimates/estimate-details/components/estimate-editor-context"
import { formatConsumption, formatMoney, parseDecimalInput } from "@/lib/formatters"
import { safeNumber } from "@/features/estimates/estimate-details/lib/estimate-editor-form"
import type { ProjectEstimateContentMaterial } from "@/types/project-estimate-content"
import type { MaterialChangePayload } from "@/features/estimates/estimate-details/types"
 
export function EstimateMaterialCard({
  index,
  material,
  workNumber,
  onArchive,
  onChange,
}: {
  index: number
  material: ProjectEstimateContentMaterial
  workNumber: string
  onArchive: () => void
  onChange: (payload: MaterialChangePayload) => void
}) {
  const { savingIds } = useEstimateEditorContext()
 
  const isDisabled = savingIds.has(material.id)
 
  const handleQuantityChange = useCallback(
    (value: string) => {
      const num = safeNumber(value)
      if (num === undefined) return
      onChange({ quantity: num, changedField: "quantity" })
    },
    [onChange]
  )
 
  const handlePriceChange = useCallback(
    (value: string) => {
      const num = safeNumber(value)
      if (num === undefined) return
      onChange({ price: num, changedField: "price" })
    },
    [onChange]
  )
 
  const handleConsumptionChange = useCallback(
    (value: string) => {
      onChange({
        consumption: parseDecimalInput(value),
        changedField: "consumption",
      })
    },
    [onChange]
  )
 
  const handleTitleChange = useCallback(
    (title: string) => onChange({ title }),
    [onChange]
  )
 
  return (
    <Card size="sm" className="min-h-36 gap-2 bg-background shadow-none">
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
            disabled={isDisabled}
            title={material.title}
            onArchive={onArchive}
          />
        </div>
        <EstimateMaterialName
          onChange={handleTitleChange}
          value={material.title}
        />
      </CardHeader>
 
      <CardContent>
        <dl className="grid grid-cols-2 gap-2 text-xs/relaxed sm:grid-cols-4">
          <EditableBadge
            label="Кол-во"
            onChange={handleQuantityChange}
            value={material.quantity}
          />
          <EditableBadge
            label="Расход"
            onChange={handleConsumptionChange}
            formatDisplay={(value) =>
              material.consumption === null
                ? "—"
                : formatConsumption(Number(value))
            }
            value={material.consumption ?? ""}
          />
          <EditableBadge
            label="Цена"
            onChange={handlePriceChange}
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
