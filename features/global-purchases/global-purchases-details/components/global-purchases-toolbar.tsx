"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { fetchProjects } from "@/features/projects/api/projects-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import { dispatchGlobalPurchasesCreateEvent } from "@/features/global-purchases/lib/global-purchases-events"
import type { GlobalPurchaseStatus } from "@/types/global-purchases"
import { FunnelIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"

const statusOptions: Array<{ value: GlobalPurchaseStatus | "all"; label: string }> = [
  { value: "all", label: "Все статусы" },
  { value: "planned", label: "План" },
  { value: "ordered", label: "Заказано" },
  { value: "partially_received", label: "Частично получено" },
  { value: "received", label: "Получено" },
  { value: "cancelled", label: "Отменено" },
]

function getStatusLabel(value: string | null) {
  return statusOptions.find((status) => status.value === value)?.label ?? "Все статусы"
}

export function GlobalPurchasesToolbar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const currentStatus = searchParams.get("status") ?? "all"
  const currentProjectId = searchParams.get("projectId") ?? ""
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

    if ("q" in updates || "status" in updates || "projectId" in updates) {
      params.delete("cursor")
    }

    const nextSearch = params.toString()
    router.replace(nextSearch ? `?${nextSearch}` : window.location.pathname)
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    replaceParams({ q: search.trim() || null })
  }

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
            <DropdownMenuTrigger asChild><Button size="sm" type="button" variant="outline"><FunnelIcon data-icon="inline-start" />{getStatusLabel(currentStatus)}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start">{statusOptions.map((option) => <DropdownMenuItem key={option.value} onClick={() => replaceParams({ status: option.value })}>{option.label}</DropdownMenuItem>)}</DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" type="button" variant="outline">{currentProjectTitle}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-72 overflow-y-auto">
              <DropdownMenuItem onClick={() => replaceParams({ projectId: null })}>Все объекты</DropdownMenuItem>
              {(projectsQuery.data?.data ?? []).map((project) => <DropdownMenuItem key={project.id} onClick={() => replaceParams({ projectId: project.id })}>{project.title}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      </div>
    </div>
  )
}
