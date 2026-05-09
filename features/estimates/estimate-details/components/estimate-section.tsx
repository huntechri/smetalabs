"use client"

import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Frame } from "@/components/ui/frame"
import { FramedButton } from "@/components/ui/framed-button"
import { Separator } from "@/components/ui/separator"
import { stages } from "@/features/estimates/__mocks__/estimates"
import { useEstimates } from "@/features/estimates/hooks/use-estimates"
import { cn } from "@/lib/utils"
import { EstimateRow } from "./estimate-row"
import { EstimateSummaryValue } from "./estimate-summary-value"
import {
  CaretRightIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"

export function EstimateSection() {
  const {
    workRows,
    expandedStages,
    setExpandedStages,
    expandedWorks,
    totals,
    toggleWork,
    updateWork,
    updateMaterial,
  } = useEstimates()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <Collapsible open={expandedStages} onOpenChange={setExpandedStages}>
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
                    expandedStages && "rotate-90"
                  )}
                />
              </Frame>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {stages.map((stage) => (
                    <Frame key={stage} className="border-orange-300">
                      <Badge>{stage}</Badge>
                    </Frame>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-md border border-dashed border-orange-300 p-2 sm:min-w-56">
              <EstimateSummaryValue label="Works" value={totals.workTotal} />
              <EstimateSummaryValue
                label="Materials"
                value={totals.materialTotal}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator className="bg-orange-500/50" />
          <div className="flex flex-col">
            {workRows.map((work) => (
              <EstimateRow
                key={work.id}
                isExpanded={expandedWorks.has(work.id)}
                onToggle={() => toggleWork(work.id)}
                onUpdateMaterial={updateMaterial}
                onUpdateWork={updateWork}
                work={work}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-yellow-500 bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <FramedButton frameClassName="border-yellow-300" variant="outline">
            <PlusIcon data-icon="inline-start" />
            Section
          </FramedButton>
          <FramedButton frameClassName="border-yellow-300" variant="outline">
            <PlusIcon data-icon="inline-start" />
            Work
          </FramedButton>
        </div>
        <FramedButton
          frameClassName="border-yellow-300"
          variant="destructive"
        >
          <TrashIcon data-icon="inline-start" />
          Delete section
        </FramedButton>
      </div>
    </section>
  )
}
