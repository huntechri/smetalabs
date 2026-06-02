"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { FolderSimplePlus } from "@phosphor-icons/react"
import { CreateProjectDialog } from "./create-project-dialog"
import { ProjectCard } from "./project-card"
import { ProjectsToolbar } from "./projects-toolbar"
import { useProjects } from "../application/use-projects"
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

    try {
      await archiveProject(project.id)
    } catch {
      // Ошибка уже попадает в общее сообщение экрана через useProjects.
    }
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
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
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

      <div className="min-h-0 flex-1 rounded-xl border border-border p-1">
        <div className="scrollbar-subtle h-full min-h-0 overflow-y-auto rounded-lg p-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-lg border bg-muted/40"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderSimplePlus />
                </EmptyMedia>
                <EmptyTitle>Проекты не найдены</EmptyTitle>
                <EmptyDescription>
                  Добавьте первый проект вручную или измените параметры поиска.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={handleCreateClick}>
                  <FolderSimplePlus data-icon="inline-start" />
                  Создать проект
                </Button>
              </EmptyContent>
            </Empty>
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

          {meta && (meta.hasMore || meta.cursor > 0) ? (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
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
        </div>
      </div>

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
