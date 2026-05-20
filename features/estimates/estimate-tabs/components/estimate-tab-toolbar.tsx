"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import {
  ExportIcon,
  FileArrowDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@phosphor-icons/react"

type ToolbarAction = {
  label: string
  icon: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
}

const tabActions: Record<string, ToolbarAction[]> = {
  estimate: [
    { label: "Импорт", icon: <FileArrowDownIcon data-icon="inline-start" /> },
    { label: "Экспорт", icon: <ExportIcon data-icon="inline-start" /> },
    { label: "Коэффициент", icon: <PlusIcon data-icon="inline-start" /> },
  ],
  purchases: [
    { label: "Импорт", icon: <FileArrowDownIcon data-icon="inline-start" /> },
    { label: "Экспорт", icon: <ExportIcon data-icon="inline-start" /> },
  ],
  execution: [
    { label: "Импорт", icon: <FileArrowDownIcon data-icon="inline-start" /> },
    { label: "Экспорт", icon: <ExportIcon data-icon="inline-start" /> },
    { label: "Доп. работа", icon: <PlusIcon data-icon="inline-start" /> },
  ],
  finances: [
    { label: "Платёж", icon: <PlusIcon data-icon="inline-start" /> },
    { label: "Экспорт", icon: <ExportIcon data-icon="inline-start" /> },
  ],
  documents: [
    { label: "Документ", icon: <PlusIcon data-icon="inline-start" /> },
    { label: "Импорт", icon: <FileArrowDownIcon data-icon="inline-start" /> },
  ],
}

function getActiveTab(pathname: string) {
  if (pathname.endsWith("/purchases")) return "purchases"
  if (pathname.endsWith("/execution")) return "execution"
  if (pathname.endsWith("/finances")) return "finances"
  if (pathname.endsWith("/documents")) return "documents"

  return "estimate"
}

export function EstimateTabToolbar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = getActiveTab(pathname)
  const actions = tabActions[activeTab]
  const [search, setSearch] = useState(searchParams.get("q") ?? "")

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "")
  }, [searchParams])

  const placeholder = useMemo(() => {
    const labels: Record<string, string> = {
      documents: "Поиск документов",
      estimate: "Поиск сметы",
      execution: "Поиск исполнения",
      finances: "Поиск финансов",
      purchases: "Поиск закупок",
    }

    return labels[activeTab]
  }, [activeTab])

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
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname)
  }

  return (
    <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
      <form className="min-w-0 flex-1" onSubmit={handleSearch}>
        <div className="flex min-w-0 items-center gap-2">
          <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
          <Input
            aria-label={placeholder}
            className="h-8"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={placeholder}
            value={search}
          />
          <Button size="sm" type="submit" variant="outline">
            <MagnifyingGlassIcon className="sm:hidden" data-icon="inline-start" />
            <span className="hidden sm:inline">Поиск</span>
          </Button>
        </div>
      </form>

      <ButtonGroup className="flex-wrap">
        {actions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            type="button"
            variant={action.variant ?? "outline"}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  )
}
