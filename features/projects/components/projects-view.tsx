"use client"

import { useProjects } from "@/features/projects/hooks/use-projects"
import { ProjectCard } from "./project-card"

export function ProjectsView() {
  const { projects } = useProjects()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col px-4 lg:px-6">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-lg border border-dashed border-red-500 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  )
}
