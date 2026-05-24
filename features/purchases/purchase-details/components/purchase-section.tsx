"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { usePurchases } from "@/features/purchases/hooks/use-purchases"
import { PurchaseRow } from "./purchase-row"
import { AddPurchaseDialog } from "./add-purchase-dialog"
import {
  ShoppingCartIcon,
  WarningCircleIcon,
  PlusIcon,
} from "@phosphor-icons/react"
import type { AddPurchaseInput, UpdatePurchaseInput } from "@/types/purchase"

const SKELETON_ROW_COUNT = 5

function PurchaseRowSkeleton() {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="m-3 grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
        <div className="min-w-0 rounded-md border border-border p-2">
          <Skeleton className="mb-1 h-3 w-20" />
          <Skeleton className="mb-1 h-4 w-full max-w-md" />
          <Skeleton className="h-3 w-8" />
        </div>
        <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
          <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
            <Skeleton className="h-3 w-16" />
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
            <Skeleton className="h-3 w-16" />
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
            <Skeleton className="h-3 w-24" />
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PurchaseToolbar({
  onAddClick,
  adding,
}: {
  onAddClick: () => void
  adding: boolean
}) {
  return (
    <div className="flex items-center gap-2 border-b border-dashed border-gray-400 px-3 py-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onAddClick}
        disabled={adding}
      >
        <PlusIcon data-icon="inline-start" />
        {adding ? "Добавление..." : "Добавить закупку"}
      </Button>
    </div>
  )
}

export function PurchaseSection({
  estimateId,
  projectId,
}: {
  estimateId: string
  projectId: string
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const {
    purchases,
    isLoading,
    isError,
    error,
    refetch,
    addPurchase,
    isAdding,
    addError: mutationError,
    updatePurchase,
    archivePurchase,
  } = usePurchases({
    estimateId,
    projectId,
  })

  const handleAdd = async (input: AddPurchaseInput) => {
    try {
      setAddError(null)
      await addPurchase(input)
      setDialogOpen(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Не удалось добавить закупку")
      throw err
    }
  }

  const handleUpdate = async (
    purchaseId: string,
    input: UpdatePurchaseInput
  ) => {
    await updatePurchase({ purchaseId, input })
  }

  const handleArchive = async (purchaseId: string) => {
    await archivePurchase(purchaseId)
  }

  if (isLoading) {
    return (
      <section
        className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm"
        aria-label="Загрузка закупок"
        aria-busy="true"
      >
        <div className="flex flex-col">
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
            <PurchaseRowSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningCircleIcon />
          </EmptyMedia>
          <EmptyTitle>Ошибка загрузки</EmptyTitle>
          <EmptyDescription>
            {error ?? "Не удалось загрузить закупки сметы"}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Повторить
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <>
      <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
        <PurchaseToolbar onAddClick={() => setDialogOpen(true)} adding={isAdding} />
        {purchases.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingCartIcon />
              </EmptyMedia>
              <EmptyTitle>Нет закупок</EmptyTitle>
              <EmptyDescription>
                По этой смете ещё нет данных о закупках
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                <PlusIcon data-icon="inline-start" />
                Добавить закупку
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col">
            {purchases.map((row, index) => (
              <PurchaseRow
                key={row.purchaseId ?? row.materialId ?? `purchase-${index}`}
                row={row}
                onUpdate={handleUpdate}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </section>

      <AddPurchaseDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setAddError(null)
        }}
        onAdd={handleAdd}
        saving={isAdding}
        error={addError ?? mutationError}
      />
    </>
  )
}
