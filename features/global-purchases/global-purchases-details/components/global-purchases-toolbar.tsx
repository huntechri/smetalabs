"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { fetchProjects } from "@/features/projects/api/projects-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import { dispatchGlobalPurchasesCreateEvent } from "@/features/global-purchases/lib/global-purchases-events"
import { CalendarDots, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"

function toDate(value: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function toIsoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatShortDate(value: string) {
  const date = toDate(value)
  if (!date) return ""
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
}

function getDateButtonLabel(dateFrom: string, dateTo: string) {
  if (dateFrom && dateTo) return `${formatShortDate(dateFrom)}–${formatShortDate(dateTo)}`
  if (dateFrom) return `с ${formatShortDate(dateFrom)}`
  if (dateTo) return `до ${formatShortDate(dateTo)}`
  return "Даты"
}

export function GlobalPurchasesToolbar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const currentProjectId = searchParams.get("projectId") ?? ""
  const dateFrom = searchParams.get("dateFrom") ?? ""
  const dateTo = searchParams.get("dateTo") ?? ""
  const projectsQuery = useQuery({
    queryKey: projectsQueryKeys.list({ status: "all", limit: 100, sort: "title_asc" }),
    queryFn: () => fetchProjects({ status: "all", limit: 100, sort: "title_asc" }),
    staleTime: 30_000,
  })

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "")
  }, [searchParams])

  const replaceParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key)
      else params.set(key, value)
    }

    if ("q" in updates || "projectId" in updates || "dateFrom" in updates || "dateTo" in updates) {
      params.delete("cursor")
    }

    const nextSearch = params.toString()
    router.replace(nextSearch ? `?${nextSearch}` : window.location.pathname)
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    replaceParams({ q: search.trim() || null })
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    replaceParams({
      dateFrom: range?.from ? toIsoDate(range.from) : null,
      dateTo: range?.to ? toIsoDate(range.to) : null,
    })
  }

  const selectedRange: DateRange | undefined = dateFrom || dateTo ? { from: toDate(dateFrom), to: toDate(dateTo) } : undefined
  const currentProjectTitle =
    projectsQuery.data?.data.find((project) => project.id === currentProjectId)?.title ?? "Все объекты"

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-2 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
      <form className="min-w-0 flex-1 rounded-md border border-border p-2" onSubmit={handleSearch}>
        <div className="flex min-w-0 items-center gap-2">
          <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
          <Input aria-label="Поиск закупок" className="h-8" onChange={(event) => setSearch(event.target.value)} placeholder="Поиск закупок" value={search} />
          <Button type="submit" variant="outline"><MagnifyingGlassIcon className="sm:hidden" data-icon="inline-start" /><span className="hidden sm:inline">Поиск</span></Button>
        </div>
      </form>
      <div className="flex rounded-md border border-border p-2">
        <ButtonGroup className="flex-wrap">
          <Button size="sm" type="button" variant="outline" onClick={dispatchGlobalPurchasesCreateEvent}><PlusIcon data-icon="inline-start" />Закупка</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" type="button" variant="outline">{currentProjectTitle}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-72 overflow-y-auto">
              <DropdownMenuItem onClick={() => replaceParams({ projectId: null })}>Все объекты</DropdownMenuItem>
              {(projectsQuery.data?.data ?? []).map((project) => <DropdownMenuItem key={project.id} onClick={() => replaceParams({ projectId: project.id })}>{project.title}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" type="button" variant="outline" aria-label="Фильтр по датам">
                <CalendarDots data-icon="inline-start" />
                {getDateButtonLabel(dateFrom, dateTo)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar mode="range" selected={selectedRange} onSelect={handleDateRangeSelect} numberOfMonths={2} />
              <div className="flex justify-end border-t p-2">
                <Button size="sm" type="button" variant="ghost" onClick={() => replaceParams({ dateFrom: null, dateTo: null })}>
                  Сбросить
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </ButtonGroup>
      </div>
    </div>
  )
}
