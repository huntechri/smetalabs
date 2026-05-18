"use client"

import { type FormEvent, useEffect, useState } from "react"
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
import { fetchDirectoryMaterials } from "@/features/directory-materials/api/directory-materials-client"
import type { DirectoryMaterial } from "@/features/directory-materials/types"
import type { GlobalPurchaseMutationInput } from "@/types/global-purchases"
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"

const MATERIAL_SEARCH_MIN_LENGTH = 2

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось сохранить закупку"
}

function materialToPurchaseInput(material: DirectoryMaterial): GlobalPurchaseMutationInput {
  return {
    title: material.name,
    unit: material.unitLabel || material.unit,
    planQuantity: 0,
    planPrice: material.priceAmount,
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
  const canSearch = submittedSearch.length >= MATERIAL_SEARCH_MIN_LENGTH
  const materialsQuery = useQuery({
    queryKey: ["global-purchases", "material-picker", submittedSearch],
    queryFn: () =>
      fetchDirectoryMaterials({
        q: submittedSearch,
        status: "active",
        limit: 50,
        sort: "relevance",
      }),
    enabled: open && canSearch,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (open) return
    setSearch("")
    setSubmittedSearch("")
    setError(null)
  }, [open])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextSearch = search.trim()
    setSubmittedSearch(nextSearch)
  }

  const handleSelect = async (material: DirectoryMaterial) => {
    try {
      setError(null)
      await onSelect(materialToPurchaseInput(material))
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const materials = canSearch ? materialsQuery.data?.data ?? [] : []
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

          {loading ? (
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

          {!loading
            ? materials.map((material) => (
                <Card key={material.id} className="m-2 rounded-md bg-transparent p-0 shadow-none">
                  <CardContent className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_120px_140px_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{material.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{material.category}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{material.unitLabel || material.unit}</div>
                    <div className="text-xs font-medium tabular-nums">{formatMoney(material.priceAmount)}</div>
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
              ))
            : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
