"use client"

import { use } from "react"

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)

  return (
    /* Outer — padding from edges (shadcn pattern) */
    <div className="h-full min-h-0 px-4 lg:px-6">

      {/* Inner — visual container */}
      <div className="h-full min-h-0 rounded-lg border border-dashed p-6 flex flex-col gap-4">

        {/* Project header stub */}
        <div className="rounded-lg border border-dashed p-4">
          <h1 className="font-heading text-sm font-medium">
            Проект: {projectId}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Детальная страница проекта (заглушка)
          </p>
        </div>

        {/* Content stub */}
        <div className="flex-1 rounded-lg border border-dashed p-6 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Контент страницы проекта появится позже
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
