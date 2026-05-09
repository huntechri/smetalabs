"use client"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { useProjects } from "@/features/projects/hooks/use-projects"
import { ProjectCard } from "@/features/projects/components/project-card"

export function ProjectsView() {
  const { projects } = useProjects()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-500 p-1">
        {/* ButtonGroup — фильтры */}
        <ButtonGroup className="flex-wrap">
          <Button variant="outline">Все</Button>
          <Button variant="outline">Активные</Button>
          <Button variant="outline">Завершённые</Button>
        </ButtonGroup>

        {/* Project cards grid */}
        <div className="rounded-lg border border-dashed p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                title={project.title}
                description={project.description}
                image={project.image}
                link={project.link}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
