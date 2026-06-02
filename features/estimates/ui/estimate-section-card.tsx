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
import { EstimateWorkCard } from "./estimate-work-card"
import { useEstimateEditorContext } from "./estimate-editor-context"
import { formatMoney } from "@/lib/formatters"
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
      type: "section",
      id: section.id,
      title: "Удалить раздел?",
      description: "Раздел, его работы и материалы будут убраны из сметы.",
    })
  }, [onArchive, section.id])

  const moveDisabled = savingIds.has(section.id)
  const deleteDisabled = savingIds.has(section.id) || savingIds.size > 0

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <Collapsible open={expandedSection} onOpenChange={setExpandedSection}>
        <div className="flex flex-col gap-4 border-b bg-muted/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <CollapsibleTrigger asChild>
            <button
              className="group flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:text-primary"
              type="button"
            >
              <CaretRightIcon
                weight="bold"
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground",
                  expandedSection && "rotate-90"
                )}
              />
              <div className="flex min-w-0 items-center gap-2">
                <Badge className="shrink-0 rounded-md font-semibold">
                  Раздел {section.number}
                </Badge>
                <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {section.title}
                </span>
              </div>
            </button>
          </CollapsibleTrigger>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="h-auto rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium"
              >
                <span className="mr-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  Работы:
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatMoney(section.worksAmount)}
                </span>
              </Badge>
              <Badge
                variant="outline"
                className="h-auto rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium"
              >
                <span className="mr-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  Материалы:
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatMoney(section.materialsAmount)}
                </span>
              </Badge>
            </div>
            <Frame>
              <ButtonGroup>
                <Button
                  aria-label="Поднять раздел"
                  disabled={
                    moveDisabled || reorderDisabled || sectionIndex === 0
                  }
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                  onClick={() => onMoveSection(section.id, "up")}
                >
                  <CaretUpIcon />
                </Button>
                <Button
                  aria-label="Опустить раздел"
                  disabled={
                    moveDisabled ||
                    reorderDisabled ||
                    sectionIndex >= sectionsCount - 1
                  }
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
          <div
            className={cn(
              "flex flex-col",
              section.works.length && "gap-3 bg-muted/20 px-3 py-2"
            )}
          >
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
                <Separator className="mt-3" />
                <div className="mt-3 flex justify-end">
                  <Frame>
                    <ButtonGroup>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={onAddSection}
                      >
                        <PlusIcon data-icon="inline-start" />
                        Раздел
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => onAddWork(section.id)}
                      >
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
