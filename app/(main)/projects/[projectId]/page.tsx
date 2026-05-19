"use client"

import { DataTable } from "@/features/projects/project-overview/components/data-table"
import data from "./data.json"

export const dynamic = "force-dynamic"

export default function ProjectDetailsPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 min-h-0">
        <div className="scrollbar-subtle flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 min-h-0 overflow-y-auto">
          <DataTable data={data} />
        </div>
      </div>
    </div>
  )
}
