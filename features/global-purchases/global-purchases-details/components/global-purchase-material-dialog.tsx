"use client"

import { type FormEvent, useState } from "react"
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

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось создать закупку"
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
  onOpenChange,
  onSelect,
  open,
  saving,
}: {
  onOpenChange: (open: boolean) => void
  onSelect: (input: GlobalPurchaseMutationInput) => Promise<void>
  open: boolean
  saving: boolean
}) {
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const materialsQuery = useQuery({
    queryKey: ["global-purchases", "material-picker", submittedSearch],
    queryFn: () =>
      fetchDirectoryMaterials({
        q: submittedSearch || undefined,
        status: "active",
        limit: 50,
        sort: "relevance",
      }),
    enabled: open,
    staleTime: 30_000,
  })

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmittedSearch(search.trim())
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

  const materials = materialsQuery.data?.data ?? []
  const loading = materialsQuery.isLoading || materialsQuery.isFetching

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-4rem)] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Добавить закупку из материалов</DialogTitle>
          <DialogDescription>
            Выберите товар из справочника материалов. В закупку попадут название, единица измерения и цена.
          </DialogDescription>
        </DialogHeader>

        <form className="flex items-center gap-2" onSubmit={handleSearch}>
          <MagnifyingGlassIcon className="shrink-0 text-muted-foreground" />
          <Input
            aria-label="Поиск материалов"
            className="h-8"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск материалов"
            value={search}
          />
          <Button type="submit" variant="outline">
            Поиск
          </Button>
        </form>

        <FieldError>{error ?? materialsQuery.error?.message ?? null}</FieldError>

        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : null}

          {!loading && materials.length === 0 ? (
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
                      Добавить
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
