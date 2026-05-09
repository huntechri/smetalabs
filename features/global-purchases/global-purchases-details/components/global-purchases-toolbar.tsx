"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  CalendarDots,
  ExportIcon,
  FileArrowDownIcon,
  Funnel,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@phosphor-icons/react"

const filterOptions = ["All Objects", "Object A", "Object B", "Object C", "None"]

const dateFilterOptions = ["All Dates", "Today", "This Week", "This Month", "Custom..."]

const actions = [
  { label: "Import", icon: <FileArrowDownIcon /> },
  { label: "Export", icon: <ExportIcon /> },
  { label: "New Purchase", icon: <PlusIcon /> },
]

export function GlobalPurchasesToolbar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [filterObject, setFilterObject] = useState("All Objects")
  const [dateFilter, setDateFilter] = useState("All Dates")

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "")
  }, [searchParams])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const params = new URLSearchParams(searchParams.toString())
    const query = search.trim()

    if (query) {
      params.set("q", query)
    } else {
      params.delete("q")
    }

    const nextSearch = params.toString()
    router.replace(nextSearch ? `?${nextSearch}` : window.location.pathname)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-cyan-300 p-2 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
      <form
        className="min-w-0 flex-1 rounded-md border border-dashed border-sky-400 p-2"
        onSubmit={handleSearch}
      >
        <div className="flex min-w-0 items-center gap-2">
          <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
          <Input
            aria-label="Search procurements"
            className="h-8"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search procurements"
            value={search}
          />
          <Button type="submit" variant="outline">
            <MagnifyingGlassIcon className="sm:hidden" data-icon="inline-start" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </div>
      </form>

      <div className="flex rounded-md border border-dashed border-teal-400 p-2">
        <ButtonGroup className="flex-wrap">
          {actions.map((action) => (
            <Button key={action.label} size="sm" type="button" variant="outline" aria-label={action.label}>
              {action.icon}
            </Button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" type="button" variant="outline" aria-label="Filter">
                <Funnel />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {filterOptions.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => setFilterObject(option)}
                >
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" type="button" variant="outline" aria-label="Date filter">
                <CalendarDots />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {dateFilterOptions.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => setDateFilter(option)}
                >
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      </div>
    </div>
  )
}
