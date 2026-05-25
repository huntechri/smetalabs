"use client"

import { useCallback, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/formatters"
import { CaretRightIcon } from "@phosphor-icons/react"
import { ExecutionRow } from "./execution-row"
import type {
  ProjectEstimateContentSection,
  ProjectEstimateContentWork,
} from "@/types/project-estimate-content"

export function ExecutionSectionCard({
  section,
  onUpdate,
}: {
  section: ProjectEstimateContentSection
  onUpdate: (id: string, updates: { factQuantity?: number; factPrice?: number }) => void
}) {
  const [expandedSection, setExpandedSection] = useState(true)

  const planTotal = section.works.reduce((sum, w) => sum + w.totalAmount, 0)
  const factTotal = section.works.reduce((sum, w) => sum + w.factTotalAmount, 0)
  const deviationTotal = planTotal - factTotal

  const deviationVariant = (() => {
    if (deviationTotal > 0) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
    }
    if (deviationTotal < 0) {
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
    }
    return "border-border text-muted-foreground bg-muted/50"
  })()

  const sign = deviationTotal > 0 ? "+" : ""

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
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="h-auto rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium"
              >
                <span className="mr-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  План:
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatMoney(planTotal)}
                </span>
              </Badge>
              <Badge
                variant="outline"
                className="h-auto rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium"
              >
                <span className="mr-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  Факт:
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatMoney(factTotal)}
                </span>
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "h-auto rounded-md px-2.5 py-1 text-xs font-medium border tabular-nums",
                  deviationVariant
                )}
              >
                <span className="mr-1 text-[10px] font-medium tracking-wider uppercase opacity-75">
                  Отклонение:
                </span>
                <span className="font-semibold">
                  {sign}{formatMoney(deviationTotal)}
                </span>
              </Badge>
            </div>
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
              section.works.map((work) => (
                <ExecutionRow
                  key={work.id}
                  row={work}
                  onUpdate={onUpdate}
                />
              ))
            ) : (
              <div className="p-4 text-xs text-muted-foreground text-center">
                В разделе пока нет работ.
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
