"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreateProjectDialog } from "./create-project-dialog"
import { ProjectCard } from "./project-card"
import { ProjectsToolbar } from "./projects-toolbar"
import { useProjects } from "@/features/projects/hooks/use-projects"
import type { ProjectMutationInput, ProjectRow } from "@/types/project"

export function ProjectsView() {
  const {
    projects,
    meta,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    setCursor,
    loading,
    isFetching,
    error,
    saving,
    createProject,
    updateProject,
    archiveProject,
  } = useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null)

  const handleCreateClick = () => {
    setEditingProject(null)
    setDialogOpen(true)
  }

  const handleEditClick = (project: ProjectRow) => {
    setEditingProject(project)
    setDialogOpen(true)
  }

  const handleSubmit = async (input: ProjectMutationInput) => {
    if (editingProject) {
      await updateProject(editingProject.id, input)
      return
    }

    await createProject(input)
  }

  const handleArchiveClick = async (project: ProjectRow) => {
    const confirmed = window.confirm(`Архивировать проект «${project.title}»?`)
    if (!confirmed) return

    await archiveProject(project.id)
  }

  const handlePreviousPage = () => {
    if (!meta) return
    setCursor(Math.max(meta.cursor - meta.limit, 0))
  }

  const handleNextPage = () => {
    if (!meta?.nextCursor) return
    setCursor(meta.nextCursor)
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <ProjectsToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onCreateClick={handleCreateClick}
        disabled={saving}
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-lg border bg-muted/40" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium">Проекты не найдены</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Добавьте первый проект вручную или измените поиск.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                disabled={saving}
                onEdit={handleEditClick}
                onArchive={handleArchiveClick}
              />
            ))}
          </div>
        )}
      </div>

      {meta && (meta.hasMore || meta.cursor > 0) ? (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Показано {projects.length} из {meta.total}
            {isFetching ? " · обновление..." : ""}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={saving || meta.cursor === 0}
              size="sm"
              type="button"
              variant="outline"
              onClick={handlePreviousPage}
            >
              Назад
            </Button>
            <Button
              disabled={saving || !meta.hasMore}
              size="sm"
              type="button"
              variant="outline"
              onClick={handleNextPage}
            >
              Далее
            </Button>
          </div>
        </div>
      ) : null}

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
