"use client"

import { type FormEvent, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import type { DirectoryAction, DirectoriesToolbarProps } from "../model/directories-model"

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
      <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <form className="min-w-0 flex-1" onSubmit={handleSearch}>
          <InputGroup className="h-8">
            <InputGroupAddon align="inline-start">
              <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label={searchAriaLabel}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
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
              disabled={action.disabled}
              key={action.label}
              onClick={action.onClick}
              size="sm"
              title={action.title ?? action.label}
              type="button"
              variant={action.variant ?? "outline"}
            >
              {action.icon}
              {action.hideLabel ? (
                <span className="sr-only">{action.label}</span>
              ) : (
                action.label
              )}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      {children}
    </div>
  )
}
