"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Frame } from "@/components/ui/frame"
import { FramedButton } from "@/components/ui/framed-button"
import { Separator } from "@/components/ui/separator"
import { EstimateSummaryValue } from "@/features/estimates/estimate-details/components/estimate-summary-value"
import { EstimateWorkCard } from "@/features/estimates/estimate-details/components/estimate-work-card"
import { cn } from "@/lib/utils"
import {
  CaretRightIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import type { EstimateContentChangeInput } from "@/features/estimates/api/project-estimate-content-client"
import type {
  ProjectEstimateContentSection,
  ProjectEstimateContentWork,
} from "@/types/project-estimate-content"

export function EstimateSectionCard({
  section,
  saving,
  onArchive,
  onAddSection,
  onAddWork,
  onAddMaterial,
  onSave,
}: {
  section: ProjectEstimateContentSection
  saving: boolean
  onArchive: (input: EstimateContentChangeInput) => void
  onAddSection: () => void
  onAddWork: (sectionId: string) => void
  onAddMaterial: (work: ProjectEstimateContentWork) => void
  onSave: (input: EstimateContentChangeInput, fallback: string) => void
}) {
  const [expandedSection, setExpandedSection] = useState(true)
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(
    () => new Set(section.works[0] ? [section.works[0].id] : [])
  )

  useEffect(() => {
    setExpandedWorks((current) => {
      const next = new Set(current)
      section.works.forEach((work) => next.add(work.id))
      return next
    })
  }, [section.works])

  const toggleWork = (workId: string) => {
    setExpandedWorks((current) => {
      const next = new Set(current)

      if (next.has(workId)) {
        next.delete(workId)
      } else {
        next.add(workId)
      }

      return next
    })
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <Collapsible open={expandedSection} onOpenChange={setExpandedSection}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full flex-col gap-3 border-b border-dashed border-orange-500 px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
            type="button"
          >
            <div className="flex min-w-0 items-start gap-3 rounded-md border border-dashed border-orange-300 p-2">
              <Frame className="border-orange-300">
                <CaretRightIcon
                  weight="bold"
                  className={cn(
                    "shrink-0 transition-transform",
                    expandedSection && "rotate-90"
                  )}
                />
              </Frame>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Frame className="border-orange-300">
                    <Badge>{`Раздел ${section.number}: ${section.title}`}</Badge>
                  </Frame>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-md border border-dashed border-orange-300 p-2 sm:min-w-56">
              <EstimateSummaryValue label="Работы" value={section.worksAmount} />
              <EstimateSummaryValue label="Материалы" value={section.materialsAmount} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator className="bg-orange-500/50" />
          <div className="flex flex-col">
            {section.works.length ? (
              section.works.map((work) => (
                <EstimateWorkCard
                  key={work.id}
                  expanded={expandedWorks.has(work.id)}
                  work={work}
                  saving={saving}
                  onArchive={onArchive}
                  onAddMaterial={onAddMaterial}
                  onSave={onSave}
                  onToggle={() => toggleWork(work.id)}
                />
              ))
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                В разделе пока нет работ.
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-yellow-500 bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <FramedButton
            frameClassName="border-yellow-300"
            variant="outline"
            onClick={onAddSection}
          >
            <PlusIcon data-icon="inline-start" />
            Раздел
          </FramedButton>
          <FramedButton
            frameClassName="border-yellow-300"
            variant="outline"
            onClick={() => onAddWork(section.id)}
          >
            <PlusIcon data-icon="inline-start" />
            Работа
          </FramedButton>
        </div>
        <FramedButton
          disabled={saving}
          frameClassName="border-yellow-300"
          variant="destructive"
          onClick={() =>
            onArchive({
              action: "archive_section",
              payload: { sectionId: section.id },
            })
          }
        >
          <TrashIcon data-icon="inline-start" />
          Удалить раздел
        </FramedButton>
      </div>
    </section>
  )
}
