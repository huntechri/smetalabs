import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMoney } from "@/lib/formatters"
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"
import type { ProjectEstimateMaterialOptionRow } from "@/types/project-estimate-content"
import type { MaterialDialogState } from "@/features/estimates/estimate-details/types"

const MATERIAL_SEARCH_MIN_LENGTH = 3
const MATERIAL_SEARCH_DELAY_MS = 250

export function EstimateMaterialPickerDialog({
  state,
  query,
  saving,
  options,
  loading,
  onQueryChange,
  onOpenChange,
  onSelect,
  onDirectorySubmit,
}: {
  state: MaterialDialogState
  query: string
  saving: boolean
  options: ProjectEstimateMaterialOptionRow[]
  loading: boolean
  onQueryChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onSelect: (row: ProjectEstimateMaterialOptionRow) => void
  onDirectorySubmit: (quantity: number, consumption: number | null, price: number, changedField: "quantity" | "consumption" | "price") => void
}) {
  const [searchText, setSearchText] = useState(query)

  const normalizedSearch = searchText.trim().replace(/\s+/g, " ")
  const canSearch = query.trim().length >= MATERIAL_SEARCH_MIN_LENGTH
  const visibleOptions = useMemo(() => (canSearch ? options : []), [canSearch, options])
  const showSearchPrompt = !canSearch
  const showEmpty = canSearch && !loading && visibleOptions.length === 0

  useEffect(() => {
    if (state.open) return
    setSearchText("")
    onQueryChange("")
  }, [onQueryChange, state.open])

  useEffect(() => {
    if (!state.open) return
    if (normalizedSearch.length < MATERIAL_SEARCH_MIN_LENGTH) {
      onQueryChange("")
      return
    }

    const timeout = window.setTimeout(
      () => onQueryChange(normalizedSearch),
      MATERIAL_SEARCH_DELAY_MS
    )
    return () => window.clearTimeout(timeout)
  }, [normalizedSearch, onQueryChange, state.open])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (normalizedSearch.length >= MATERIAL_SEARCH_MIN_LENGTH) {
      onQueryChange(normalizedSearch)
    }
  }

  const handleSelect = (material: ProjectEstimateMaterialOptionRow) => {
    onSelect(material)
    onDirectorySubmit(0, null, material.price, "quantity")
  }


  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[min(720px,calc(100vh-4rem))] max-h-[calc(100vh-4rem)] flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>Добавить материал из справочника</DialogTitle>
            <DialogDescription>
              Выберите материал из справочника материалов. Он добавится внутрь выбранной работы.
            </DialogDescription>
          </DialogHeader>

          <form className="flex shrink-0 items-center gap-2" onSubmit={handleSearch}>
            <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
            <Input
              aria-label="Поиск материалов"
              className="h-8"
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Введите минимум 3 символа"
              value={searchText}
            />
            <Button type="submit" variant="outline">
              Поиск
            </Button>
          </form>

          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
            {showSearchPrompt ? (
              <Empty className="h-full min-h-80 border-0">
                <EmptyHeader>
                  <EmptyTitle>Введите название материала</EmptyTitle>
                  <EmptyDescription>Поиск начнётся после ввода минимум 3 символов.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}

            {loading && visibleOptions.length === 0 ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-md" />
                ))}
              </div>
            ) : null}

            {showEmpty ? (
              <Empty className="h-full min-h-80 border-0">
                <EmptyHeader>
                  <EmptyTitle>Материалы не найдены</EmptyTitle>
                  <EmptyDescription>Измените поиск или добавьте материал в справочник.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}

            {visibleOptions.map((material) => (
              <Card key={material.id} className="m-2 rounded-md bg-transparent p-0 shadow-none">
                <CardContent className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_80px_120px_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{material.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {material.category}
                      {material.supplierName ? ` · ${material.supplierName}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{material.unitLabel}</div>
                  <div className="text-xs font-medium tabular-nums">{formatMoney(material.price)}</div>
                  <Button
                    disabled={saving}
                    onClick={() => handleSelect(material)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <PlusIcon data-icon="inline-start" />
                    Добавить
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
      </DialogContent>
    </Dialog>
  )
}
