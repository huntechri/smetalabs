"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { FieldError } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchProjects } from "@/features/projects/api/projects-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import { useGlobalPurchases } from "@/features/global-purchases/hooks/use-global-purchases"
import { GLOBAL_PURCHASES_CREATE_EVENT } from "@/features/global-purchases/lib/global-purchases-events"
import type { GlobalPurchaseMutationInput, GlobalPurchaseRow } from "@/types/global-purchases"
import { GlobalPurchaseMaterialDialog } from "./global-purchase-material-dialog"
import { GlobalPurchasesRow } from "./global-purchases-row"

const DEFAULT_LIMIT = 50
const SKELETON_ROW_COUNT = 6

function GlobalPurchasesRowSkeleton() {
  return (
    <Card size="sm" className="mx-3 my-1.5 rounded-md bg-transparent p-0">
      <CardContent className="grid gap-2 p-2 xl:grid-cols-[minmax(220px,1.2fr)_96px_minmax(180px,0.7fr)_minmax(180px,0.7fr)_minmax(260px,1fr)]">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-2 rounded-md border border-border p-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function GlobalPurchasesRowsSkeleton() {
  return <div aria-label="Загрузка закупок" aria-busy="true">{Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => <GlobalPurchasesRowSkeleton key={index} />)}</div>
}

export function GlobalPurchasesSection() {
  const { archivePurchase, createPurchase, error, isFetching, loading, meta, params, purchases, saving, setCursor, updatePurchase } = useGlobalPurchases()
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const projectsQuery = useQuery({
    queryKey: projectsQueryKeys.list({ status: "all", limit: 100, sort: "title_asc" }),
    queryFn: () => fetchProjects({ status: "all", limit: 100, sort: "title_asc" }),
    staleTime: 30_000,
  })

  useEffect(() => {
    const handleCreate = () => setMaterialDialogOpen(true)
    window.addEventListener(GLOBAL_PURCHASES_CREATE_EVENT, handleCreate)
    return () => window.removeEventListener(GLOBAL_PURCHASES_CREATE_EVENT, handleCreate)
  }, [])

  const handleArchive = async (purchase: GlobalPurchaseRow) => {
    const confirmed = window.confirm(`Архивировать закупку «${purchase.title}»? Она исчезнет из обычного списка.`)
    if (!confirmed) return
    await archivePurchase(purchase.id)
  }

  const handleUpdate = async (purchase: GlobalPurchaseRow, input: GlobalPurchaseMutationInput) => {
    await updatePurchase(purchase.id, input)
  }

  const handleCreateFromMaterial = async (input: GlobalPurchaseMutationInput) => {
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
  const projects = projectsQuery.data?.data ?? []

  return (
    <>
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg py-0 shadow-sm">
        {error ? <FieldError className="m-3 mb-0 rounded-md border border-destructive/30 bg-destructive/10 p-3">{error}</FieldError> : null}
        <CardContent className="scrollbar-subtle relative min-h-0 flex-1 overflow-y-auto px-0 py-0">
          {showSkeletonRows ? <GlobalPurchasesRowsSkeleton /> : null}
          {!showSkeletonRows && purchases.length === 0 ? <Empty className="h-full border-0"><EmptyHeader><EmptyTitle>Закупки не найдены</EmptyTitle><EmptyDescription>Добавьте закупку из справочника материалов или измените поиск.</EmptyDescription></EmptyHeader></Empty> : null}
          {!showSkeletonRows ? purchases.map((row) => <GlobalPurchasesRow key={row.id} onArchive={handleArchive} onUpdate={handleUpdate} projects={projects} row={row} saving={saving || isFetching || projectsQuery.isFetching} />) : null}
        </CardContent>
        {meta ? <CardFooter className="flex flex-col gap-3 border-t p-3 text-xs/relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><div>Показано {pageStart}–{pageEnd}. Всего: {totalLabel}</div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={currentCursor === 0 || loading || isFetching} onClick={() => setCursor(previousCursor)}>Назад</Button><Button type="button" size="sm" variant="outline" disabled={!meta.hasMore || loading || isFetching} onClick={() => setCursor(nextCursor)}>Вперёд</Button></div></CardFooter> : null}
      </Card>
      <GlobalPurchaseMaterialDialog onOpenChange={setMaterialDialogOpen} onSelect={handleCreateFromMaterial} open={materialDialogOpen} saving={saving} />
    </>
  )
}
