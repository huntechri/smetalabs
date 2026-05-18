"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { FieldError } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { useGlobalPurchases } from "@/features/global-purchases/hooks/use-global-purchases"
import { GLOBAL_PURCHASES_CREATE_EVENT } from "@/features/global-purchases/lib/global-purchases-events"
import type { GlobalPurchaseMutationInput, GlobalPurchaseRow } from "@/types/global-purchases"
import { GlobalPurchaseFormDialog } from "./global-purchase-form-dialog"
import { GlobalPurchasesRow } from "./global-purchases-row"

const DEFAULT_LIMIT = 50
const SKELETON_ROW_COUNT = 6

function GlobalPurchasesRowSkeleton() {
  return (
    <Card size="sm" className="mx-3 my-1.5 rounded-md bg-transparent p-0">
      <CardContent className="grid min-w-0 gap-3 p-3 xl:grid-cols-[minmax(420px,1fr)_minmax(620px,1fr)]">
        <div className="grid min-w-0 gap-3 rounded-md border border-border p-2 sm:grid-cols-[minmax(0,1fr)_minmax(160px,0.35fr)]">
          <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-full max-w-md" /><Skeleton className="h-5 w-44 rounded-md" /></div>
          <div className="space-y-2"><Skeleton className="h-3 w-12" /><Skeleton className="h-4 w-24" /></div>
        </div>
        <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-[minmax(240px,0.85fr)_minmax(260px,0.9fr)_minmax(160px,0.35fr)]">
          <div className="space-y-1.5 rounded-md border border-border p-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-40 rounded-md" /></div>
          <div className="space-y-1.5 rounded-md border border-border p-1.5"><Skeleton className="h-3 w-24" /><Skeleton className="h-5 w-52 rounded-md" /></div>
          <div className="rounded-md border border-border p-1.5"><Skeleton className="ml-auto size-6 rounded-md" /></div>
        </div>
      </CardContent>
    </Card>
  )
}

export function GlobalPurchasesRowsSkeleton() {
  return <div aria-label="Загрузка закупок" aria-busy="true">{Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => <GlobalPurchasesRowSkeleton key={index} />)}</div>
}

export function GlobalPurchasesSection() {
  const { archivePurchase, createPurchase, error, isFetching, loading, meta, params, purchases, saving, setCursor, updatePurchase } = useGlobalPurchases()
  const [formOpen, setFormOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<GlobalPurchaseRow | null>(null)
  const [insertAfterPurchase, setInsertAfterPurchase] = useState<GlobalPurchaseRow | null>(null)

  useEffect(() => {
    const handleCreate = () => {
      setSelectedPurchase(null)
      setInsertAfterPurchase(null)
      setFormOpen(true)
    }
    window.addEventListener(GLOBAL_PURCHASES_CREATE_EVENT, handleCreate)
    return () => window.removeEventListener(GLOBAL_PURCHASES_CREATE_EVENT, handleCreate)
  }, [])

  const handleEdit = (purchase: GlobalPurchaseRow) => {
    setSelectedPurchase(purchase)
    setInsertAfterPurchase(null)
    setFormOpen(true)
  }

  const handleInsertAfter = (purchase: GlobalPurchaseRow) => {
    setSelectedPurchase(null)
    setInsertAfterPurchase(purchase)
    setFormOpen(true)
  }

  const handleArchive = async (purchase: GlobalPurchaseRow) => {
    const confirmed = window.confirm(`Архивировать закупку «${purchase.title}»? Она исчезнет из обычного списка.`)
    if (!confirmed) return
    await archivePurchase(purchase.id)
  }

  const handleSubmit = async (input: GlobalPurchaseMutationInput) => {
    if (selectedPurchase) {
      await updatePurchase(selectedPurchase.id, input)
      return
    }
    await createPurchase(input)
  }

  const currentCursor = params.cursor ?? 0
  const currentLimit = params.limit ?? meta?.limit ?? DEFAULT_LIMIT
  const pageStart = purchases.length > 0 ? currentCursor + 1 : 0
  const pageEnd = currentCursor + purchases.length
  const totalLabel = meta?.hasMore ? `минимум ${meta.total}` : String(meta?.total ?? purchases.length)
  const previousCursor = Math.max(currentCursor - currentLimit, 0)
  const nextCursor = meta?.nextCursor ?? currentCursor + currentLimit
  const showSkeletonRows = loading || isFetching

  return (
    <>
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg py-0 shadow-sm">
        {error ? <FieldError className="m-3 mb-0 rounded-md border border-destructive/30 bg-destructive/10 p-3">{error}</FieldError> : null}
        <CardContent className="scrollbar-subtle relative min-h-0 flex-1 overflow-y-auto px-0 py-0">
          {showSkeletonRows ? <GlobalPurchasesRowsSkeleton /> : null}
          {!showSkeletonRows && purchases.length === 0 ? <Empty className="h-full border-0"><EmptyHeader><EmptyTitle>Закупки не найдены</EmptyTitle><EmptyDescription>Добавьте первую закупку вручную или измените поиск.</EmptyDescription></EmptyHeader></Empty> : null}
          {!showSkeletonRows ? purchases.map((row) => <GlobalPurchasesRow key={row.id} onArchive={handleArchive} onEdit={handleEdit} onInsertAfter={handleInsertAfter} row={row} saving={saving || isFetching} />) : null}
        </CardContent>
        {meta ? <CardFooter className="flex flex-col gap-3 border-t p-3 text-xs/relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><div>Показано {pageStart}–{pageEnd}. Всего: {totalLabel}</div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={currentCursor === 0 || loading || isFetching} onClick={() => setCursor(previousCursor)}>Назад</Button><Button type="button" size="sm" variant="outline" disabled={!meta.hasMore || loading || isFetching} onClick={() => setCursor(nextCursor)}>Вперёд</Button></div></CardFooter> : null}
      </Card>
      <GlobalPurchaseFormDialog onOpenChange={(open) => { setFormOpen(open); if (!open) setInsertAfterPurchase(null) }} onSubmit={async (input) => { await handleSubmit(input); setFormOpen(false); setSelectedPurchase(null); setInsertAfterPurchase(null) }} open={formOpen} purchase={selectedPurchase} saving={saving} title={insertAfterPurchase ? "Новая закупка ниже" : undefined} />
    </>
  )
}
