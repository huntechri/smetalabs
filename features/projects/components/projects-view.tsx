"use client"

import { useProjects } from "@/features/projects/hooks/use-projects"
import { ProjectsToolbar } from "./projects-toolbar"
import { ProjectCard } from "./project-card"

export function ProjectsView() {
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredProjects,
  } = useProjects()

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <ProjectsToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="rounded-lg border border-dashed border-red-500 p-4">
        {filteredProjects.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Проекты не найдены
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
