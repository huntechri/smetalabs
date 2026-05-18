"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Funnel, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"
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
  onCreateClick: () => void
  disabled?: boolean
}

export function ProjectsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCreateClick,
  disabled,
}: ProjectsToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search)

  useEffect(() => {
    setLocalSearch(search)
  }, [search])

  const activeStatusLabel = useMemo(
    () => STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? "Все статусы",
    [statusFilter]
  )

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchChange(localSearch.trim())
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-2 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <form
          className="min-w-0 flex-1 rounded-md border border-border p-2"
          onSubmit={handleSearch}
        >
          <div className="flex min-w-0 items-center gap-2">
            <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
            <Input
              aria-label="Поиск проектов"
              className="h-8"
              disabled={disabled}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Поиск проектов"
              value={localSearch}
            />
            <Button disabled={disabled} type="submit" variant="outline">
              <MagnifyingGlassIcon className="sm:hidden" data-icon="inline-start" />
              <span className="hidden sm:inline">Поиск</span>
            </Button>
          </div>
        </form>

        <div className="flex rounded-md border border-border p-2">
          <ButtonGroup className="flex-wrap">
            <Button disabled={disabled} size="sm" type="button" variant="outline" onClick={onCreateClick}>
              <PlusIcon data-icon="inline-start" />
              Добавить
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={disabled} size="sm" type="button" variant="outline" aria-label="Фильтр">
                  <Funnel data-icon="inline-start" />
                  {activeStatusLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onStatusFilterChange(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        </div>
      </div>
    </div>
  )
}
