"use client"

import { ChartAreaInteractive } from "@/features/dashboard/chart-area-interactive"
import { DataTable } from "@/features/dashboard/data-table"
import { SectionCards } from "@/features/dashboard/section-cards-dashboard"
import data from "./data.json"

export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 min-h-0">
        <div className="scrollbar-subtle flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 min-h-0 overflow-y-auto">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>
          <DataTable data={data} />
        </div>
      </div>
    </div>
  )
}
