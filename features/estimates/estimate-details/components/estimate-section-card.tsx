import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EstimateWorkCard } from "@/features/estimates/estimate-details/components/estimate-work-card"
import { formatMoney } from "@/lib/formatters"
import type { EstimateContentChangeInput } from "@/features/estimates/api/project-estimate-content-client"
import type {
  ProjectEstimateContentSection,
  ProjectEstimateContentWork,
} from "@/types/project-estimate-content"

export function EstimateSectionCard({
  section,
  saving,
  onArchive,
  onAddWork,
  onAddMaterial,
  onSave,
}: {
  section: ProjectEstimateContentSection
  saving: boolean
  onArchive: (input: EstimateContentChangeInput) => void
  onAddWork: (sectionId: string) => void
  onAddMaterial: (work: ProjectEstimateContentWork) => void
  onSave: (input: EstimateContentChangeInput, fallback: string) => void
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Раздел {section.number}</Badge>
            <span className="font-medium">{section.title}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>Работы: {formatMoney(section.worksAmount)}</span>
            <span>Материалы: {formatMoney(section.materialsAmount)}</span>
            <span>Итого: {formatMoney(section.totalAmount)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={saving} size="sm" variant="outline" onClick={() => onAddWork(section.id)}>
            Работа
          </Button>
          <Button
            disabled={saving}
            size="sm"
            variant="destructive"
            onClick={() =>
              onArchive({
                action: "archive_section",
                payload: { sectionId: section.id },
              })
            }
          >
            Удалить раздел
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {section.works.length ? (
          section.works.map((work) => (
            <EstimateWorkCard
              key={work.id}
              work={work}
              saving={saving}
              onArchive={onArchive}
              onAddMaterial={onAddMaterial}
              onSave={onSave}
            />
          ))
        ) : (
          <div className="p-4 text-sm text-muted-foreground">
            В разделе пока нет работ.
          </div>
        )}
      </div>
    </section>
  )
}
