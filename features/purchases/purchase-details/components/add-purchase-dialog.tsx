"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchGlobalPurchaseMaterialOptions } from "@/features/global-purchases/api/global-purchases-client"
import type {
  GlobalPurchaseMaterialOption,
} from "@/types/global-purchases"
import type { AddPurchaseInput } from "@/types/purchase"
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"

const MATERIAL_SEARCH_MIN_LENGTH = 2
const MATERIAL_SEARCH_DELAY_MS = 250

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
}

function parseQuantity(value: string) {
  const parsed = Number(value.trim().replace(",", "."))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function AddPurchaseDialog({
  onAdd,
  open,
  onOpenChange,
  saving,
  error,
}: {
  onAdd: (input: AddPurchaseInput) => Promise<void>
  open: boolean
  onOpenChange: (open: boolean) => void
  saving: boolean
  error: string | null
}) {
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
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

  // Reset state when dialog closes
  useEffect(() => {
    if (open) return
    setSearch("")
    setSubmittedSearch("")
  }, [open])

  // Debounce search
  useEffect(() => {
    if (!open) return
    if (normalizedSearch.length < MATERIAL_SEARCH_MIN_LENGTH) {
      setSubmittedSearch("")
      return
    }

    const timeout = window.setTimeout(
      () => setSubmittedSearch(normalizedSearch),
      MATERIAL_SEARCH_DELAY_MS
    )
    return () => window.clearTimeout(timeout)
  }, [normalizedSearch, open])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (normalizedSearch.length >= MATERIAL_SEARCH_MIN_LENGTH)
      setSubmittedSearch(normalizedSearch)
  }

  const handleSelectMaterial = async (
    material: GlobalPurchaseMaterialOption
  ) => {
    await onAdd({
      directoryMaterialId: material.id,
      quantity: 1,
      price: material.planPrice,
    })
  }

  const materials = useMemo(
    () => (canSearch ? (materialsQuery.data?.data ?? []) : []),
    [canSearch, materialsQuery.data]
  )
  const loading =
    canSearch && (materialsQuery.isLoading || materialsQuery.isFetching)
  const showSearchPrompt = !canSearch
  const showEmpty = canSearch && !loading && materials.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(720px,calc(100vh-4rem))] max-h-[calc(100vh-4rem)] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Добавить закупку из материалов</DialogTitle>
          <DialogDescription>
            Выберите материал из справочника. Количество по умолчанию — 1,
            цену можно изменить после добавления.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex shrink-0 items-center gap-2"
          onSubmit={handleSearch}
        >
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

        <FieldError>
          {error ?? materialsQuery.error?.message ?? null}
        </FieldError>

        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
          {showSearchPrompt ? (
            <Empty className="h-full min-h-80 border-0">
              <EmptyHeader>
                <EmptyTitle>Введите название материала</EmptyTitle>
                <EmptyDescription>
                  Поиск начнётся после ввода минимум 2 символов.
                </EmptyDescription>
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
                <EmptyDescription>
                  Измените поиск или добавьте материал в справочник.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {materials.map((material) => (
            <Card
              key={material.id}
              className="m-2 rounded-md bg-transparent p-0 shadow-none"
            >
              <CardContent className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_120px_140px_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {material.title}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {material.category}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {material.unit}
                </div>
                <div className="text-xs font-medium tabular-nums">
                  {formatMoney(material.planPrice)}
                </div>
                <Button
                  disabled={saving}
                  onClick={() => handleSelectMaterial(material)}
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
