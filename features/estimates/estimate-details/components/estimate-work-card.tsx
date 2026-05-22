"use client"

import { useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { EditableBadge } from "@/components/ui/editable-badge"
import { Frame } from "@/components/ui/frame"
import { EstimateMaterialCard } from "@/features/estimates/estimate-details/components/estimate-material-card"
import { EstimateName } from "@/features/estimates/estimate-details/components/estimate-name"
import { EstimateWorkNumber } from "@/features/estimates/estimate-details/components/estimate-work-number"
import { useEstimateEditorContext } from "@/features/estimates/estimate-details/components/estimate-editor-context"
import { formatMoney } from "@/lib/formatters"
import { safeNumber } from "@/features/estimates/estimate-details/lib/estimate-editor-form"
import { cn } from "@/lib/utils"
import {
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import type { ProjectEstimateContentWork } from "@/types/project-estimate-content"

export function EstimateWorkCard({
  expanded,
  work,
  workIndex,
  worksCount,
  onArchiveSection,
  onToggle,
}: {
  expanded: boolean
  work: ProjectEstimateContentWork
  workIndex: number
  worksCount: number
  onArchiveSection: () => void
  onToggle: () => void
}) {
  const {
    savingIds,
    reorderDisabled,
    onArchive,
    onAddSection,
    onAddWork,
    onAddMaterial,
    onMoveWork,
    onReplaceWork,
    onSave,
  } = useEstimateEditorContext()

  const isDisabled = savingIds.has(work.id)

  const updateMaterial = useCallback(
    (materialId: string, payload: { title?: string; quantity?: number; consumption?: number | null; price?: number; changedField?: "quantity" | "consumption" | "price" }) => {
      onSave({
        action: "update_material",
        payload: { materialId, ...payload },
      })
    },
    [onSave]
  )

  const archiveWork = useCallback(
    () =>
      onArchive({
        input: {
          action: "archive_work",
          payload: { workId: work.id },
        },
        title: "Удалить работу?",
        description: "Работа и все её материалы будут убраны из сметы.",
      }),
    [onArchive, work.id]
  )

  const handleQuantityChange = useCallback(
    (value: string) => {
      const num = safeNumber(value)
      if (num === undefined) return
      onSave({
        action: "update_work",
        payload: { workId: work.id, quantity: num },
      })
    },
    [onSave, work.id]
  )

  const handlePriceChange = useCallback(
    (value: string) => {
      const num = safeNumber(value)
      if (num === undefined) return
      onSave({
        action: "update_work",
        payload: { workId: work.id, price: num },
      })
    },
    [onSave, work.id]
  )

  const handleTitleChange = useCallback(
    (title: string) =>
      onSave({
        action: "update_work",
        payload: { workId: work.id, title },
      }),
    [onSave, work.id]
  )

  const actionButtons = (
    <Frame className="shrink-0">
      <ButtonGroup>
        <Button
          aria-label="Поднять работу"
          disabled={isDisabled || reorderDisabled || workIndex === 0}
          size="icon-xs"
          type="button"
          variant="ghost"
          onClick={() => onMoveWork(work.sectionId, work.id, "up")}
        >
          <CaretUpIcon />
        </Button>
        <Button
          aria-label="Опустить работу"
          disabled={isDisabled || reorderDisabled || workIndex >= worksCount - 1}
          size="icon-xs"
          type="button"
          variant="ghost"
          onClick={() => onMoveWork(work.sectionId, work.id, "down")}
        >
          <CaretDownIcon />
        </Button>
        <Button
          aria-label="Заменить работу"
          disabled={isDisabled}
          size="icon-xs"
          type="button"
          variant="ghost"
          onClick={() => onReplaceWork(work)}
        >
          <PencilSimpleIcon />
        </Button>
        <Button
          aria-label="Удалить работу"
          disabled={isDisabled}
          size="icon-xs"
          type="button"
          variant="ghost"
          onClick={archiveWork}
        >
          <TrashIcon />
        </Button>
      </ButtonGroup>
    </Frame>
  )

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <div className="border-b last:border-b-0">
        <div className="m-2 flex flex-col gap-2 rounded-md border bg-background p-2 transition-colors hover:bg-muted/50 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2">
            <div className="flex w-full items-center gap-2 lg:w-auto">
              <CollapsibleTrigger asChild>
                <button
                  aria-label={expanded ? "Свернуть работу" : "Развернуть работу"}
                  type="button"
                >
                  <Frame>
                    <CaretRightIcon
                      weight="bold"
                      className={cn(
                        "shrink-0 transition-transform",
                        expanded && "rotate-90"
                      )}
                    />
                  </Frame>
                </button>
              </CollapsibleTrigger>
              <EstimateWorkNumber value={work.number} />
              <div className="ml-auto lg:hidden">{actionButtons}</div>
            </div>
            <EstimateName onChange={handleTitleChange} value={work.title} />
          </div>

          <div className="flex w-full flex-col gap-2 rounded-md border bg-background p-2 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-80">
              <EditableBadge
                label="Кол-во"
                onChange={handleQuantityChange}
                suffix={work.unitLabel}
                value={work.quantity}
              />
              <EditableBadge
                label="Цена"
                onChange={handlePriceChange}
                value={work.price}
              />
              <Badge
                variant="outline"
                className="gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums"
              >
                <span className="text-muted-foreground">Итого:</span>
                <span>{formatMoney(work.totalAmount)}</span>
              </Badge>
            </div>
            <div className="hidden lg:inline-flex">{actionButtons}</div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t bg-muted/20 px-4 py-4">
            <div className="rounded-md border bg-background p-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {work.materials.map((material, index) => (
                  <EstimateMaterialCard
                    key={material.id}
                    index={index}
                    material={material}
                    materialsCount={work.materials.length}
                    workNumber={work.number}
                    onArchive={() =>
                      onArchive({
                        input: {
                          action: "archive_material",
                          payload: { materialId: material.id },
                        },
                        title: "Удалить материал?",
                        description: "Материал будет убран из этой работы.",
                      })
                    }
                    onChange={(payload) => updateMaterial(material.id, payload)}
                  />
                ))}
              </div>

              <div className="mt-3 flex justify-end border-t pt-3">
                <Frame>
                  <ButtonGroup>
                    <Button size="xs" variant="outline" onClick={onAddSection}>
                      <PlusIcon data-icon="inline-start" />
                      Раздел
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => onAddWork(work.sectionId)}>
                      <PlusIcon data-icon="inline-start" />
                      Работа
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => onAddMaterial(work)}>
                      <PlusIcon data-icon="inline-start" />
                      Материал
                    </Button>
                    <Button
                      aria-label="Удалить раздел"
                      disabled={isDisabled}
                      size="icon-xs"
                      variant="destructive"
                      onClick={onArchiveSection}
                    >
                      <TrashIcon />
                    </Button>
                  </ButtonGroup>
                </Frame>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
