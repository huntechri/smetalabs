"use client"

import { SectionCards } from "@/features/dashboard/section-cards-dashboard"
import { ProjectsView } from "@/features/projects/components/projects-view"

export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 min-h-0">
        <div className="scrollbar-subtle flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 min-h-0 overflow-y-auto">
          <SectionCards />
          <div className="flex-1 min-h-0">
            <ProjectsView />
          </div>
        </div>
      </div>
    </div>
  )
}
