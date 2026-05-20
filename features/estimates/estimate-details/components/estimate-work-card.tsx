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
import { formatMoney } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import {
  CaretRightIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import type { EstimateContentChangeInput } from "@/features/estimates/api/project-estimate-content-client"
import type {
  EstimateArchive,
  MaterialChangePayload,
} from "@/features/estimates/estimate-details/types"
import type { ProjectEstimateContentWork } from "@/types/project-estimate-content"

export function EstimateWorkCard({
  expanded,
  work,
  saving,
  onArchive,
  onAddSection,
  onAddWork,
  onAddMaterial,
  onArchiveSection,
  onReplaceWork,
  onSave,
  onToggle,
}: {
  expanded: boolean
  work: ProjectEstimateContentWork
  saving: boolean
  onArchive: EstimateArchive
  onAddSection: () => void
  onAddWork: () => void
  onAddMaterial: (work: ProjectEstimateContentWork) => void
  onArchiveSection: () => void
  onReplaceWork: (work: ProjectEstimateContentWork) => void
  onSave: (input: EstimateContentChangeInput, fallback: string) => void
  onToggle: () => void
}) {
  const updateMaterial = (materialId: string, payload: MaterialChangePayload) => {
    onSave(
      {
        action: "update_material",
        payload: { materialId, ...payload },
      },
      "Не удалось сохранить изменение"
    )
  }

  const archiveWork = () =>
    onArchive({
      input: {
        action: "archive_work",
        payload: { workId: work.id },
      },
      title: "Удалить работу?",
      description: "Работа и все её материалы будут убраны из сметы.",
      fallback: "Не удалось удалить работу",
    })

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <div className="border-b last:border-b-0">
        <div className="m-3 flex flex-col gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-muted/50 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
            <div className="flex w-full items-center gap-3 lg:w-auto">
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
              <Frame className="ml-auto lg:hidden">
                <ButtonGroup>
                  <Button
                    aria-label="Заменить работу"
                    disabled={saving}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                    onClick={() => onReplaceWork(work)}
                  >
                    <PencilSimpleIcon />
                  </Button>
                  <Button
                    aria-label="Удалить работу"
                    disabled={saving}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                    onClick={archiveWork}
                  >
                    <TrashIcon />
                  </Button>
                </ButtonGroup>
              </Frame>
            </div>
            <EstimateName
              onChange={(title) =>
                onSave(
                  { action: "update_work", payload: { workId: work.id, title } },
                  "Не удалось сохранить изменение"
                )
              }
              value={work.title}
            />
          </div>

          <div className="flex w-full flex-col gap-3 rounded-md border bg-background p-2 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-80">
              <EditableBadge
                label="Кол-во"
                onChange={(value) =>
                  onSave(
                    {
                      action: "update_work",
                      payload: { workId: work.id, quantity: Number(value) },
                    },
                    "Не удалось сохранить изменение"
                  )
                }
                suffix={work.unitLabel}
                value={work.quantity}
              />
              <EditableBadge
                label="Цена"
                onChange={(value) =>
                  onSave(
                    {
                      action: "update_work",
                      payload: { workId: work.id, price: Number(value) },
                    },
                    "Не удалось сохранить изменение"
                  )
                }
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
            <Frame className="hidden lg:inline-flex">
              <ButtonGroup>
                <Button
                  aria-label="Заменить работу"
                  disabled={saving}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                  onClick={() => onReplaceWork(work)}
                >
                  <PencilSimpleIcon />
                </Button>
                <Button
                  aria-label="Удалить работу"
                  disabled={saving}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                  onClick={archiveWork}
                >
                  <TrashIcon />
                </Button>
              </ButtonGroup>
            </Frame>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t bg-muted/20 px-4 py-4">
            <div className="rounded-md border bg-background p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {work.materials.map((material, index) => (
                  <EstimateMaterialCard
                    key={material.id}
                    index={index}
                    material={material}
                    saving={saving}
                    workNumber={work.number}
                    onArchive={() =>
                      onArchive({
                        input: {
                          action: "archive_material",
                          payload: { materialId: material.id },
                        },
                        title: "Удалить материал?",
                        description: "Материал будет убран из этой работы.",
                        fallback: "Не удалось удалить материал",
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
                    <Button size="xs" variant="outline" onClick={onAddWork}>
                      <PlusIcon data-icon="inline-start" />
                      Работа
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => onAddMaterial(work)}>
                      <PlusIcon data-icon="inline-start" />
                      Материал
                    </Button>
                    <Button
                      aria-label="Удалить раздел"
                      disabled={saving}
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
