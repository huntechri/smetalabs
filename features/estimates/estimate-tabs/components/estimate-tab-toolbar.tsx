"use client"

import { type FormEvent, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  ExportIcon,
  FileArrowDownIcon,
  MagnifyingGlassIcon,
  PercentIcon,
  PlusIcon,
} from "@phosphor-icons/react"

type ToolbarAction = {
  label: string
  icon: React.ReactNode
  action?: "workCoefficient" | "addPurchase" | "import" | "export" | "addWork"
  variant?: React.ComponentProps<typeof Button>["variant"]
}

const tabActions: Record<string, ToolbarAction[]> = {
  estimate: [
    {
      label: "Импорт",
      icon: <FileArrowDownIcon data-icon="inline-start" />,
      action: "import",
    },
    {
      label: "Экспорт",
      icon: <ExportIcon data-icon="inline-start" />,
      action: "export",
    },
    {
      label: "Коэффициент",
      icon: <PercentIcon data-icon="inline-start" />,
      action: "workCoefficient",
    },
  ],
  purchases: [
    {
      label: "Добавить закупку",
      icon: <PlusIcon data-icon="inline-start" />,
      action: "addPurchase",
    },
    {
      label: "Экспорт",
      icon: <ExportIcon data-icon="inline-start" />,
      action: "export",
    },
  ],
  execution: [
    {
      label: "Экспорт",
      icon: <ExportIcon data-icon="inline-start" />,
      action: "export",
    },
    {
      label: "Работа",
      icon: <PlusIcon data-icon="inline-start" />,
      action: "addWork",
    },
  ],
  finances: [
    { label: "Платёж", icon: <PlusIcon data-icon="inline-start" /> },
    {
      label: "Экспорт",
      icon: <ExportIcon data-icon="inline-start" />,
      action: "export",
    },
  ],
  documents: [
    { label: "Документ", icon: <PlusIcon data-icon="inline-start" /> },
    {
      label: "Импорт",
      icon: <FileArrowDownIcon data-icon="inline-start" />,
      action: "import",
    },
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

  const q = searchParams.get("q") ?? ""
  const [prevQ, setPrevQ] = useState(q)
  const [search, setSearch] = useState(q)

  if (q !== prevQ) {
    setPrevQ(q)
    setSearch(q)
  }

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

  const replaceSearch = (params: URLSearchParams) => {
    const nextSearch = params.toString()
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname)
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const params = new URLSearchParams(searchParams.toString())
    const query = search.trim()

    if (query) {
      params.set("q", query)
    } else {
      params.delete("q")
    }

    replaceSearch(params)
  }

  const handleAction = (action: ToolbarAction) => {
    if (action.action === "workCoefficient") {
      const params = new URLSearchParams(searchParams.toString())
      params.set("dialog", "work-coefficient")
      replaceSearch(params)
    } else if (action.action === "import") {
      if (activeTab === "estimate") {
        const params = new URLSearchParams(searchParams.toString())
        params.set("dialog", "import-estimate")
        replaceSearch(params)
      } else {
        window.dispatchEvent(new CustomEvent(`project-${activeTab}:import`))
      }
    } else if (action.action === "export") {
      if (activeTab === "estimate") {
        window.dispatchEvent(new CustomEvent("project-estimate:export"))
      } else {
        window.dispatchEvent(new CustomEvent(`project-${activeTab}:export`))
      }
    } else if (action.action === "addWork") {
      window.dispatchEvent(new CustomEvent(`project-${activeTab}:add-work`))
    }
    if (action.action === "addPurchase") {
      const params = new URLSearchParams(searchParams.toString())
      params.set("dialog", "add-purchase")
      replaceSearch(params)
    }
  }

  return (
    <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
      <form className="min-w-0 flex-1" onSubmit={handleSearch}>
        <InputGroup className="h-8">
          <InputGroupAddon align="inline-start">
            <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={placeholder}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={placeholder}
            value={search}
          />
          <InputGroupAddon align="inline-end">
            <Button
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
        {actions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            type="button"
            variant={action.variant ?? "outline"}
            onClick={() => handleAction(action)}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  )
}
