"use client"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { usePurchases } from "@/features/purchases/hooks/use-purchases"
import { PurchaseRow } from "./purchase-row"
import { ShoppingCartIcon, WarningCircleIcon } from "@phosphor-icons/react"

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

export function PurchaseSection({
  estimateId,
  projectId,
}: {
  estimateId: string
  projectId: string
}) {
  const { purchases, isLoading, isError, error, refetch } = usePurchases({
    estimateId,
    projectId,
  })

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

  if (purchases.length === 0) {
    return (
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
      </Empty>
    )
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {purchases.map((row, index) => (
          <PurchaseRow
            key={row.materialId ?? `purchase-${index}`}
            row={row}
          />
        ))}
      </div>
    </section>
  )
}
