"use client"

import { use } from "react"

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-500 p-1">
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
        <div className="rounded-lg border border-dashed p-6 flex items-center justify-center mt-4">
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
