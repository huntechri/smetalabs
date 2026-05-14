"use client"

import { type FormEvent, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"

export type DirectoryAction = {
  label: string
  icon: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
  disabled?: boolean
  title?: string
  onClick?: () => void
}

export type DirectoriesToolbarProps = {
  searchPlaceholder: string
  searchAriaLabel: string
  actions: DirectoryAction[]
  children?: React.ReactNode
}

export function DirectoriesToolbar({
  searchPlaceholder,
  searchAriaLabel,
  actions,
  children,
}: DirectoriesToolbarProps) {
  const pathname = usePathname()
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
    params.delete("cursor")

    const nextSearch = params.toString()
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-cyan-300 p-2 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <form
          className="min-w-0 flex-1 rounded-md border border-dashed border-sky-400 p-2"
          onSubmit={handleSearch}
        >
          <div className="flex min-w-0 items-center gap-2">
            <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
            <Input
              aria-label={searchAriaLabel}
              className="h-8"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              value={search}
            />
            <Button type="submit" variant="outline">
              <MagnifyingGlassIcon className="sm:hidden" data-icon="inline-start" />
              <span className="hidden sm:inline">Поиск</span>
            </Button>
          </div>
        </form>

        <div className="flex rounded-md border border-dashed border-teal-400 p-2">
          <ButtonGroup className="flex-wrap">
            {actions.map((action) => (
              <Button
                disabled={action.disabled}
                key={action.label}
                onClick={action.onClick}
                size="sm"
                title={action.title}
                type="button"
                variant={action.variant ?? "outline"}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      </div>
      {children}
    </div>
  )
}
