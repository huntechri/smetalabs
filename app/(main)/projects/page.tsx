"use client"

import { ProjectsView } from "@/features/projects/components/projects-view"

export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
        <div className="scrollbar-subtle flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4 md:gap-6 md:py-6">
          <div className="min-h-0 flex-1">
            <ProjectsView />
          </div>
        </div>
      </div>
    </div>
  )
}
