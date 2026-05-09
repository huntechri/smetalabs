"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import {
  ExportIcon,
  FileArrowDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@phosphor-icons/react"

const actions = [
  { label: "Import", icon: <FileArrowDownIcon data-icon="inline-start" /> },
  { label: "Export", icon: <ExportIcon data-icon="inline-start" /> },
  { label: "New Purchase", icon: <PlusIcon data-icon="inline-start" /> },
]

export function GlobalPurchasesToolbar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")

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
            <Button key={action.label} size="sm" type="button" variant="outline">
              {action.icon}
              {action.label}
            </Button>
          ))}
        </ButtonGroup>
      </div>
    </div>
  )
}
