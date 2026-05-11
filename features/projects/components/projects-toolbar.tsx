"use client"

import { Suspense, type FormEvent, type KeyboardEvent, useState } from "react"
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"
import type { ProjectStatus } from "@/types/project"

const STATUS_OPTIONS: { label: string; value: ProjectStatus | "all" }[] = [
  { label: "Все статусы", value: "all" },
  { label: "Новый", value: "new" },
  { label: "В работе", value: "in_progress" },
  { label: "Завершён", value: "completed" },
]

export interface ProjectsToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: ProjectStatus | "all"
  onStatusFilterChange: (value: ProjectStatus | "all") => void
}

export function ProjectsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: ProjectsToolbarProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(search)

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchChange(localSearch.trim())
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      onSearchChange(localSearch.trim())
    }
  }

  return (
    <Suspense fallback={null}>
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-cyan-300 p-2 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
      <form
        className="min-w-0 flex-1 rounded-md border border-dashed border-sky-400 p-2"
        onSubmit={handleSearch}
      >
        <div className="flex min-w-0 items-center gap-2">
          <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
          <Input
            aria-label="Поиск проектов"
            className="h-8"
            onChange={(event) => setLocalSearch(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск проектов"
            value={localSearch}
          />
          <Button type="submit" variant="outline">
            <MagnifyingGlassIcon className="sm:hidden" data-icon="inline-start" />
            <span className="hidden sm:inline">Поиск</span>
          </Button>
        </div>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex rounded-md border border-dashed border-teal-400 p-2">
          <ButtonGroup className="flex-wrap">
            <Button
              size="sm"
              type="button"
              variant="default"
              onClick={() => setDialogOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              +Создать
            </Button>
          </ButtonGroup>
        </div>

        <div className="rounded-md border border-dashed border-teal-400 p-2">
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              onStatusFilterChange(value as ProjectStatus | "all")
            }
          >
            <SelectTrigger className="h-8 min-w-[160px]">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Suspense>
  )
}
