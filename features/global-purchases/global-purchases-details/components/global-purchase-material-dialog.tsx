"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
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
import { fetchGlobalPurchaseMaterialOptions } from "@/features/global-purchases/api/global-purchases-client"
import type {
  GlobalPurchaseMaterialOption,
  GlobalPurchaseMutationInput,
} from "@/types/global-purchases"
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"

const MATERIAL_SEARCH_MIN_LENGTH = 2
const MATERIAL_SEARCH_DELAY_MS = 250

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось сохранить закупку"
}

function getTodayIsoDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseQuantity(value: string) {
  const parsed = Number(value.trim().replace(",", "."))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function materialToPurchaseInput(
  material: GlobalPurchaseMaterialOption,
  factQuantity: number | null
): GlobalPurchaseMutationInput {
  return {
    title: material.title,
    unit: material.unit,
    planQuantity: 0,
    planPrice: material.planPrice,
    factQuantity,
    factPrice: material.planPrice,
    supplierId: null,
    projectId: null,
    purchaseDate: getTodayIsoDate(),
    status: "planned",
    notes: null,
  }
}

export function GlobalPurchaseMaterialDialog({
  actionLabel = "Добавить",
  closeOnSelect = false,
  description = "Выберите товар из справочника материалов. В закупку попадут название, единица измерения и цена.",
  onOpenChange,
  onSelect,
  open,
  quantityPrompt = true,
  saving,
  title = "Добавить закупку из материалов",
}: {
  actionLabel?: string
  closeOnSelect?: boolean
  description?: string
  onOpenChange: (open: boolean) => void
  onSelect: (input: GlobalPurchaseMutationInput) => Promise<void>
  open: boolean
  quantityPrompt?: boolean
  saving: boolean
  title?: string
}) {
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<GlobalPurchaseMaterialOption | null>(null)
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false)
  const [quantity, setQuantity] = useState("1")
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const normalizedSearch = search.trim().replace(/\s+/g, " ")
  const canSearch = submittedSearch.length >= MATERIAL_SEARCH_MIN_LENGTH
  const materialsQuery = useQuery({
    queryKey: ["global-purchases", "material-options", submittedSearch],
    queryFn: () => fetchGlobalPurchaseMaterialOptions(submittedSearch),
    enabled: open && canSearch,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
  })

  useEffect(() => {
    if (open) return
    setSearch("")
    setSubmittedSearch("")
    setError(null)
    setSelectedMaterial(null)
    setQuantityDialogOpen(false)
    setQuantity("1")
    setQuantityError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (normalizedSearch.length < MATERIAL_SEARCH_MIN_LENGTH) {
      setSubmittedSearch("")
      return
    }

    const timeout = window.setTimeout(() => setSubmittedSearch(normalizedSearch), MATERIAL_SEARCH_DELAY_MS)
    return () => window.clearTimeout(timeout)
  }, [normalizedSearch, open])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (normalizedSearch.length >= MATERIAL_SEARCH_MIN_LENGTH) setSubmittedSearch(normalizedSearch)
  }

  const handleSelect = async (material: GlobalPurchaseMaterialOption) => {
    if (quantityPrompt) {
      setSelectedMaterial(material)
      setQuantity("1")
      setQuantityError(null)
      setQuantityDialogOpen(true)
      return
    }

    try {
      setError(null)
      await onSelect(materialToPurchaseInput(material, null))
      if (closeOnSelect) onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleQuantitySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedMaterial) return

    const parsedQuantity = parseQuantity(quantity)
    if (parsedQuantity === null) {
      setQuantityError("Введите количество больше 0")
      return
    }

    try {
      setQuantityError(null)
      setError(null)
      await onSelect(materialToPurchaseInput(selectedMaterial, parsedQuantity))
      setQuantityDialogOpen(false)
      setSelectedMaterial(null)
      setQuantity("1")
      if (closeOnSelect) onOpenChange(false)
    } catch (err) {
      setQuantityError(getErrorMessage(err))
    }
  }

  const materials = useMemo(() => (canSearch ? materialsQuery.data?.data ?? [] : []), [canSearch, materialsQuery.data])
  const loading = canSearch && (materialsQuery.isLoading || materialsQuery.isFetching)
  const showSearchPrompt = !canSearch
  const showEmpty = canSearch && !loading && materials.length === 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[min(720px,calc(100vh-4rem))] max-h-[calc(100vh-4rem)] flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <form className="flex shrink-0 items-center gap-2" onSubmit={handleSearch}>
            <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
            <Input
              aria-label="Поиск материалов"
              className="h-8"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Введите минимум 2 символа"
              value={search}
            />
            <Button type="submit" variant="outline">
              Поиск
            </Button>
          </form>

          <FieldError>{error ?? materialsQuery.error?.message ?? null}</FieldError>

          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
            {showSearchPrompt ? (
              <Empty className="h-full min-h-80 border-0">
                <EmptyHeader>
                  <EmptyTitle>Введите название материала</EmptyTitle>
                  <EmptyDescription>Поиск начнётся после ввода минимум 2 символов.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}

            {loading && materials.length === 0 ? (
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

            {materials.map((material) => (
              <Card key={material.id} className="m-2 rounded-md bg-transparent p-0 shadow-none">
                <CardContent className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_120px_140px_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{material.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{material.category}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{material.unit}</div>
                  <div className="text-xs font-medium tabular-nums">{formatMoney(material.planPrice)}</div>
                  <Button
                    disabled={saving}
                    onClick={() => handleSelect(material)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <PlusIcon data-icon="inline-start" />
                    {actionLabel}
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
              {selectedMaterial ? selectedMaterial.title : "Введите количество материала"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleQuantitySubmit}>
            <Input
              autoFocus
              inputMode="decimal"
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="Количество"
              value={quantity}
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
