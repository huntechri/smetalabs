"use client"

import { Suspense, type FormEvent, type KeyboardEvent, useState } from "react"
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FunnelIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"
import type { ProjectStatus } from "@/types/project"

const STATUS_OPTIONS: { label: string; value: ProjectStatus }[] = [
  { label: "Новый", value: "new" },
  { label: "В работе", value: "in_progress" },
  { label: "Завершён", value: "completed" },
]

export interface ProjectsToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: ProjectStatus[]
  onStatusFilterChange: (value: ProjectStatus[]) => void
}

export function ProjectsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: ProjectsToolbarProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(search)
  const [popoverOpen, setPopoverOpen] = useState(false)

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

  const handleStatusToggle = (value: ProjectStatus) => {
    const updated = statusFilter.includes(value)
      ? statusFilter.filter((s) => s !== value)
      : [...statusFilter, value]
    onStatusFilterChange(updated)
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

            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <FunnelIcon data-icon="inline-start" />
                  <span className="hidden sm:inline">Фильтр</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id={`status-${option.value}`}
                        checked={statusFilter.includes(option.value)}
                        onCheckedChange={() =>
                          handleStatusToggle(option.value)
                        }
                      />
                      <Label
                        htmlFor={`status-${option.value}`}
                        className="cursor-pointer text-sm"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </ButtonGroup>
        </div>
      </div>
    </div>
      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Suspense>
  )
}
