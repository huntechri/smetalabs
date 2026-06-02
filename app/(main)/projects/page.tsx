"use client"

import { ProjectsView } from "@/features/projects/ui/projects-view"

export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <div className="@container/main flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-6 lg:px-6">
      <ProjectsView />
    </div>
  )
}
