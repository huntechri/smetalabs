"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Frame } from "@/components/ui/frame"
import { Separator } from "@/components/ui/separator"
import { EstimateSummaryValue } from "@/features/estimates/estimate-details/components/estimate-summary-value"
import { EstimateWorkCard } from "@/features/estimates/estimate-details/components/estimate-work-card"
import { useEstimateEditorContext } from "@/features/estimates/estimate-details/components/estimate-editor-context"
import { cn } from "@/lib/utils"
import {
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import type { ProjectEstimateContentSection } from "@/types/project-estimate-content"

export function EstimateSectionCard({
  section,
  sectionIndex,
  sectionsCount,
}: {
  section: ProjectEstimateContentSection
  sectionIndex: number
  sectionsCount: number
}) {
  const {
    savingIds,
    reorderDisabled,
    onArchive,
    onAddSection,
    onAddWork,
    onMoveSection,
  } = useEstimateEditorContext()

  const [expandedSection, setExpandedSection] = useState(true)
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(
    () => new Set(section.works[0] ? [section.works[0].id] : [])
  )
  const prevWorkIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const currentIds = new Set(section.works.map((w) => w.id))
    const newIds = new Set(
      [...currentIds].filter((id) => !prevWorkIdsRef.current.has(id))
    )

    if (newIds.size > 0) {
      setExpandedWorks((current) => {
        const next = new Set(current)
        newIds.forEach((id) => next.add(id))
        return next
      })
    }

    prevWorkIdsRef.current = currentIds
  }, [section.works])

  const toggleWork = useCallback((workId: string) => {
    setExpandedWorks((current) => {
      const next = new Set(current)

      if (next.has(workId)) {
        next.delete(workId)
      } else {
        next.add(workId)
      }

      return next
    })
  }, [])

  const archiveSection = useCallback(() => {
    onArchive({
      input: {
        action: "archive_section",
        payload: { sectionId: section.id },
      },
      title: "Удалить раздел?",
      description: "Раздел, его работы и материалы будут убраны из сметы.",
    })
  }, [onArchive, section.id])

  const moveDisabled = savingIds.has(section.id)
  const deleteDisabled = savingIds.has(section.id) || savingIds.size > 0

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <Collapsible open={expandedSection} onOpenChange={setExpandedSection}>
        <div className="flex flex-col gap-4 border-b px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <CollapsibleTrigger asChild>
            <button
              className="flex min-w-0 flex-1 items-start gap-3 rounded-md border bg-background p-2 text-left transition-colors hover:bg-muted/50"
              type="button"
            >
              <Frame>
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
                  <Frame>
                    <Badge>{`Раздел ${section.number}: ${section.title}`}</Badge>
                  </Frame>
                </div>
              </div>
            </button>
          </CollapsibleTrigger>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-2 gap-2 rounded-md border bg-background p-2 sm:min-w-56">
              <EstimateSummaryValue label="Работы" value={section.worksAmount} />
              <EstimateSummaryValue label="Материалы" value={section.materialsAmount} />
            </div>
            <Frame>
              <ButtonGroup>
                <Button
                  aria-label="Поднять раздел"
                  disabled={moveDisabled || reorderDisabled || sectionIndex === 0}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                  onClick={() => onMoveSection(section.id, "up")}
                >
                  <CaretUpIcon />
                </Button>
                <Button
                  aria-label="Опустить раздел"
                  disabled={moveDisabled || reorderDisabled || sectionIndex >= sectionsCount - 1}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                  onClick={() => onMoveSection(section.id, "down")}
                >
                  <CaretDownIcon />
                </Button>
              </ButtonGroup>
            </Frame>
          </div>
        </div>

        <CollapsibleContent>
          <Separator />
          <div className={cn("flex flex-col", section.works.length && "bg-muted/20 p-3 gap-3")}>
            {section.works.length ? (
              section.works.map((work, index) => (
                <EstimateWorkCard
                  key={work.id}
                  expanded={expandedWorks.has(work.id)}
                  work={work}
                  workIndex={index}
                  worksCount={section.works.length}
                  onArchiveSection={archiveSection}
                  onToggle={() => toggleWork(work.id)}
                />
              ))
            ) : (
              <div className="p-4 text-xs text-muted-foreground">
                <p>В разделе пока нет работ.</p>
                <div className="mt-3 flex justify-end border-t pt-3">
                  <Frame>
                    <ButtonGroup>
                      <Button size="xs" variant="outline" onClick={onAddSection}>
                        <PlusIcon data-icon="inline-start" />
                        Раздел
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => onAddWork(section.id)}>
                        <PlusIcon data-icon="inline-start" />
                        Работа
                      </Button>
                      <Button
                        aria-label="Удалить раздел"
                        disabled={deleteDisabled}
                        size="icon-xs"
                        variant="destructive"
                        onClick={archiveSection}
                      >
                        <TrashIcon />
                      </Button>
                    </ButtonGroup>
                  </Frame>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
