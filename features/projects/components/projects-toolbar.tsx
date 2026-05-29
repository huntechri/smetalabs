"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
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
    () =>
      STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ??
      "Все статусы",
    [statusFilter]
  )

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchChange(localSearch.trim())
  }

  return (
    <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
      <form className="min-w-0 flex-1" onSubmit={handleSearch}>
        <InputGroup className="h-8">
          <InputGroupAddon align="inline-start">
            <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Поиск проектов"
            disabled={disabled}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Поиск проектов"
            value={localSearch}
          />
          <InputGroupAddon align="inline-end">
            <Button
              disabled={disabled}
              size="sm"
              type="submit"
              variant="ghost"
              className="h-6 gap-1"
            >
              <span className="hidden sm:inline">Поиск</span>
              <MagnifyingGlassIcon
                className="sm:hidden"
                data-icon="inline-start"
              />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </form>

      <ButtonGroup className="flex-wrap">
        <Button
          disabled={disabled}
          size="sm"
          type="button"
          variant="outline"
          onClick={onCreateClick}
        >
          <PlusIcon data-icon="inline-start" />
          Добавить
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={disabled}
              size="sm"
              type="button"
              variant="outline"
              aria-label="Фильтр"
            >
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
  )
}
