import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { EditableBadge } from "@/components/ui/editable-badge"
import { Frame } from "@/components/ui/frame"
import { FramedButton } from "@/components/ui/framed-button"
import { getTotal } from "@/lib/calculations"
import { formatMoney } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { EstimateMaterialCard } from "./estimate-material-card"
import { EstimateName } from "./estimate-name"
import { EstimateWorkActions } from "./estimate-work-actions"
import { EstimateWorkNumber } from "./estimate-work-number"
import { CaretRightIcon, PlusIcon } from "@phosphor-icons/react"

import type { Material, Work } from "@/types/estimate"

export function EstimateRow({
  isExpanded,
  onToggle,
  onUpdateWork,
  onUpdateMaterial,
  work,
}: {
  isExpanded: boolean
  onToggle: () => void
  onUpdateWork: (id: string, updates: Partial<Work>) => void
  onUpdateMaterial: (
    workId: string,
    materialId: string,
    updates: Partial<Material>
  ) => void
  work: Work
}) {
  const workTotal = getTotal(work.quantity, work.price)

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border-b border-dashed border-green-500 last:border-b-0">
        <div className="m-3 flex flex-col gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
            <div className="flex w-full items-center gap-3 lg:w-auto">
              <CollapsibleTrigger asChild>
                <button
                  aria-label={isExpanded ? "Collapse work" : "Expand work"}
                  type="button"
                >
                  <Frame className="border-green-300">
                    <CaretRightIcon
                      weight="bold"
                      className={cn(
                        "shrink-0 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </Frame>
                </button>
              </CollapsibleTrigger>
              <EstimateWorkNumber value={work.number} />
              <div className="ml-auto rounded-md border border-dashed border-green-300 p-1 lg:hidden">
                <EstimateWorkActions />
              </div>
            </div>
            <EstimateName
              onChange={(value) =>
                onUpdateWork(work.id, { title: value })
              }
              value={work.title}
            />
          </div>

          <div className="flex w-full flex-col gap-3 rounded-md border border-dashed border-green-400 p-2 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-80">
              <EditableBadge
                label="Qty"
                onChange={(value) =>
                  onUpdateWork(work.id, { quantity: Number(value) })
                }
                suffix={work.unit}
                value={work.quantity}
              />
              <EditableBadge
                label="Price"
                onChange={(value) =>
                  onUpdateWork(work.id, { price: Number(value) })
                }
                value={work.price}
              />
              <Badge
                variant="outline"
                className="gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums"
              >
                <span className="text-muted-foreground">Total:</span>
                <span>{formatMoney(workTotal)}</span>
              </Badge>
            </div>
            <div className="hidden rounded-md border border-dashed border-green-300 p-1 lg:block">
              <EstimateWorkActions />
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t border-dashed border-purple-500 bg-muted/20 px-4 py-4">
            <div className="rounded-md border border-dashed border-purple-400 p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {work.materials.map((material, index) => (
                  <EstimateMaterialCard
                    key={material.id}
                    index={index}
                    material={material}
                    workNumber={work.number}
                    onUpdate={(id, updates) =>
                      onUpdateMaterial(work.id, id, updates)
                    }
                  />
                ))}
              </div>

              <div className="mt-3 flex justify-end border-t border-dashed border-purple-300 pt-3">
                <FramedButton
                  frameClassName="border-purple-300"
                  variant="outline"
                >
                  <PlusIcon data-icon="inline-start" />
                  Material
                </FramedButton>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
