import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMoney } from "@/lib/formatters"
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"
import type { ProjectEstimateMaterialOptionRow } from "@/types/project-estimate-content"
import type { MaterialDialogState } from "@/features/estimates/estimate-details/types"

const MATERIAL_SEARCH_MIN_LENGTH = 2
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
  onDirectorySubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const [submittedSearch, setSubmittedSearch] = useState(query.trim())
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false)
  const [quantity, setQuantity] = useState("1")
  const [consumption, setConsumption] = useState("")
  const [price, setPrice] = useState("0")
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const normalizedSearch = query.trim().replace(/\s+/g, " ")
  const canSearch = submittedSearch.length >= MATERIAL_SEARCH_MIN_LENGTH
  const visibleOptions = useMemo(() => (canSearch ? options : []), [canSearch, options])
  const showSearchPrompt = !canSearch
  const showEmpty = canSearch && !loading && visibleOptions.length === 0

  useEffect(() => {
    if (state.open) return
    setSubmittedSearch("")
    setQuantityDialogOpen(false)
    setQuantity("1")
    setConsumption("")
    setPrice("0")
    setQuantityError(null)
  }, [state.open])

  useEffect(() => {
    if (!state.open) return
    if (normalizedSearch.length < MATERIAL_SEARCH_MIN_LENGTH) {
      setSubmittedSearch("")
      return
    }

    const timeout = window.setTimeout(
      () => setSubmittedSearch(normalizedSearch),
      MATERIAL_SEARCH_DELAY_MS
    )
    return () => window.clearTimeout(timeout)
  }, [normalizedSearch, state.open])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (normalizedSearch.length >= MATERIAL_SEARCH_MIN_LENGTH) {
      setSubmittedSearch(normalizedSearch)
    }
  }

  const handleSelect = (material: ProjectEstimateMaterialOptionRow) => {
    onSelect(material)
    setQuantity("1")
    setConsumption("")
    setPrice(String(material.price))
    setQuantityError(null)
    setQuantityDialogOpen(true)
  }

  const handleQuantitySubmit = (event: FormEvent<HTMLFormElement>) => {
    const parsedQuantity = Number(quantity.trim().replace(",", "."))
    const parsedConsumption = consumption.trim()
      ? Number(consumption.trim().replace(",", "."))
      : null
    const parsedPrice = Number(price.trim().replace(",", "."))

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      event.preventDefault()
      setQuantityError("Введите количество больше 0")
      return
    }

    if (parsedConsumption !== null && (!Number.isFinite(parsedConsumption) || parsedConsumption <= 0)) {
      event.preventDefault()
      setQuantityError("Введите корректный расход")
      return
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      event.preventDefault()
      setQuantityError("Введите корректную цену")
      return
    }

    setQuantityError(null)
    onDirectorySubmit(event)
    setQuantityDialogOpen(false)
  }

  return (
    <>
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
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Введите минимум 2 символа"
              value={query}
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
                  <EmptyDescription>Поиск начнётся после ввода минимум 2 символов.</EmptyDescription>
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

      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Количество</DialogTitle>
            <DialogDescription>
              {state.selected ? state.selected.title : "Введите количество материала"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleQuantitySubmit}>
            <Input
              autoFocus
              inputMode="decimal"
              name="quantity"
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="Количество"
              value={quantity}
            />
            <Input
              inputMode="decimal"
              name="consumption"
              onChange={(event) => setConsumption(event.target.value)}
              placeholder="Расход"
              value={consumption}
            />
            <Input
              inputMode="decimal"
              name="price"
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Цена"
              value={price}
            />
            <FieldError>{quantityError}</FieldError>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuantityDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={saving}>
                Добавить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
