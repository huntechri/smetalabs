"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
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

function materialToPurchaseInput(material: GlobalPurchaseMaterialOption): GlobalPurchaseMutationInput {
  return {
    title: material.title,
    unit: material.unit,
    planQuantity: 0,
    planPrice: material.planPrice,
    factQuantity: null,
    factPrice: null,
    supplierId: null,
    projectId: null,
    purchaseDate: null,
    status: "planned",
    notes: null,
  }
}

export function GlobalPurchaseMaterialDialog({
  actionLabel = "Добавить",
  description = "Выберите товар из справочника материалов. В закупку попадут название, единица измерения и цена.",
  onOpenChange,
  onSelect,
  open,
  saving,
  title = "Добавить закупку из материалов",
}: {
  actionLabel?: string
  description?: string
  onOpenChange: (open: boolean) => void
  onSelect: (input: GlobalPurchaseMutationInput) => Promise<void>
  open: boolean
  saving: boolean
  title?: string
}) {
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
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
    try {
      setError(null)
      await onSelect(materialToPurchaseInput(material))
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const materials = useMemo(() => (canSearch ? materialsQuery.data?.data ?? [] : []), [canSearch, materialsQuery.data])
  const loading = canSearch && (materialsQuery.isLoading || materialsQuery.isFetching)
  const showSearchPrompt = !canSearch
  const showEmpty = canSearch && !loading && materials.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-4rem)] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="flex items-center gap-2" onSubmit={handleSearch}>
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
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyTitle>Введите название материала</EmptyTitle>
                <EmptyDescription>Поиск начнётся после ввода минимум 2 символов.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {loading && materials.length === 0 ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : null}

          {showEmpty ? (
            <Empty className="border-0">
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
  )
}
