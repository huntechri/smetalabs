"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
    <div className="grid gap-3 rounded-lg border border-border p-3 lg:grid-cols-[minmax(300px,1fr)_minmax(600px,1.3fr)]">
      <div className="flex flex-col sm:flex-row min-w-0 gap-3">
        <div className="flex-1 min-w-0 rounded-md border border-border p-2">
          <Skeleton className="mb-1 h-3 w-20" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="w-full sm:w-[76px] shrink-0 rounded-md border border-border p-2">
          <Skeleton className="mb-1 h-3 w-10" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
        <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border bg-muted/5 p-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border bg-muted/5 p-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border bg-muted/5 p-2">
          <Skeleton className="h-3 w-24" />
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        </div>
      </div>
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [addError, setAddError] = useState<string | null>(null)

  const dialogOpen = searchParams.get("dialog") === "add-purchase"

  const closeDialog = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("dialog")
    const next = params.toString()
    router.replace(next ? `?${next}` : window.location.pathname)
  }, [router, searchParams])

  const openAddDialog = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("dialog", "add-purchase")
    router.replace(`?${params.toString()}`)
  }, [router, searchParams])

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
      closeDialog()
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
        className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm"
        aria-label="Загрузка закупок"
        aria-busy="true"
      >
        <div className="flex flex-col gap-3 p-3">
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
      <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
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
                onClick={openAddDialog}
              >
                <PlusIcon data-icon="inline-start" />
                Добавить закупку
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3 p-3">
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
          if (!open) {
            closeDialog()
            setAddError(null)
          }
        }}
        onAdd={handleAdd}
        saving={isAdding}
        error={addError ?? mutationError}
      />
    </>
  )
}
