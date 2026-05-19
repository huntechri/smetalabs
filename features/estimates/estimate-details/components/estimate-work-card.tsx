import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EditableBadge } from "@/components/ui/editable-badge"
import { Textarea } from "@/components/ui/textarea"
import { EstimateMaterialCard } from "@/features/estimates/estimate-details/components/estimate-material-card"
import { formatMoney } from "@/lib/formatters"
import type { EstimateContentChangeInput } from "@/features/estimates/api/project-estimate-content-client"
import type { MaterialChangePayload } from "@/features/estimates/estimate-details/types"
import type { ProjectEstimateContentWork } from "@/types/project-estimate-content"

export function EstimateWorkCard({
  work,
  saving,
  onArchive,
  onAddMaterial,
  onSave,
}: {
  work: ProjectEstimateContentWork
  saving: boolean
  onArchive: (input: EstimateContentChangeInput) => void
  onAddMaterial: (work: ProjectEstimateContentWork) => void
  onSave: (input: EstimateContentChangeInput, fallback: string) => void
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

  return (
    <div className="rounded-md border border-dashed p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{work.number}</Badge>
            {work.code ? <Badge variant="outline">{work.code}</Badge> : null}
            <Badge variant="secondary">{work.unitLabel}</Badge>
            {work.category ? <Badge variant="outline">{work.category}</Badge> : null}
          </div>
          <Textarea
            defaultValue={work.title}
            disabled={saving}
            onBlur={(event) => {
              const title = event.currentTarget.value.trim()
              if (title && title !== work.title) {
                onSave(
                  { action: "update_work", payload: { workId: work.id, title } },
                  "Не удалось сохранить изменение"
                )
              }
            }}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-96">
          <EditableBadge
            label="Кол-во"
            suffix={work.unitLabel}
            value={work.quantity}
            onChange={(value) =>
              onSave(
                {
                  action: "update_work",
                  payload: { workId: work.id, quantity: Number(value) },
                },
                "Не удалось сохранить изменение"
              )
            }
          />
          <EditableBadge
            label="Цена"
            value={work.price}
            onChange={(value) =>
              onSave(
                {
                  action: "update_work",
                  payload: { workId: work.id, price: Number(value) },
                },
                "Не удалось сохранить изменение"
              )
            }
          />
          <Badge variant="outline" className="justify-center">
            {formatMoney(work.totalAmount)}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button disabled={saving} size="sm" variant="outline" onClick={() => onAddMaterial(work)}>
            Материал
          </Button>
          <Button
            disabled={saving}
            size="sm"
            variant="destructive"
            onClick={() => onArchive({ action: "archive_work", payload: { workId: work.id } })}
          >
            Удалить
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {work.materials.map((material) => (
          <EstimateMaterialCard
            key={material.id}
            material={material}
            saving={saving}
            onArchive={() =>
              onArchive({
                action: "archive_material",
                payload: { materialId: material.id },
              })
            }
            onChange={(payload) => updateMaterial(material.id, payload)}
          />
        ))}
      </div>
    </div>
  )
}
