"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useGlobalPurchases } from "@/features/global-purchases/hooks/use-global-purchases"
import {
  GLOBAL_PURCHASES_CREATE_EVENT,
  GLOBAL_PURCHASES_IMPORT_EVENT,
} from "@/features/global-purchases/lib/global-purchases-events"
import type { GlobalPurchaseMutationInput, GlobalPurchaseRow } from "@/types/global-purchases"
import type { ProjectRow } from "@/types/project"
import { GlobalPurchaseMaterialDialog } from "./global-purchase-material-dialog"
import { GlobalPurchasesImportDialog } from "./global-purchases-import-dialog"
import { GlobalPurchasesRow } from "./global-purchases-row"

const DEFAULT_LIMIT = 50
const SKELETON_ROW_COUNT = 6

function GlobalPurchasesRowSkeleton() {
  return (
    <Card size="sm" className="mx-3 my-1.5 rounded-md bg-transparent p-0">
      <CardContent className="grid gap-2 p-2 xl:grid-cols-[minmax(460px,2fr)_76px_minmax(150px,0.55fr)_minmax(230px,0.85fr)_minmax(240px,0.85fr)]">
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

function buildReplaceInput(row: GlobalPurchaseRow, selected: GlobalPurchaseMutationInput): GlobalPurchaseMutationInput {
  return {
    title: selected.title,
    unit: selected.unit,
    planQuantity: row.planQuantity,
    planPrice: selected.planPrice,
    factQuantity: row.factQuantity,
    factPrice: row.factPrice,
    supplierId: row.supplierId,
    projectId: row.projectId,
    purchaseDate: row.purchaseDate,
    status: row.status,
    notes: row.notes,
  }
}

type PurchaseGroup = {
  key: string
  title: string
  rows: GlobalPurchaseRow[]
}

function groupPurchasesByProject(rows: GlobalPurchaseRow[]): PurchaseGroup[] {
  const groups = new Map<string, PurchaseGroup>()

  for (const row of rows) {
    const key = row.projectId ?? "without-project"
    const title = row.projectTitle ?? "Без объекта"
    const group = groups.get(key)

    if (group) group.rows.push(row)
    else groups.set(key, { key, title, rows: [row] })
  }

  return Array.from(groups.values())
}

export function GlobalPurchasesSection({
  projects,
  projectsLoading,
}: {
  projects: ProjectRow[]
  projectsLoading: boolean
}) {
  const { archivePurchase, createPurchase, error, isFetching, loading, meta, params, purchases, saving, setCursor, updatePurchase } = useGlobalPurchases()
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [replacementRow, setReplacementRow] = useState<GlobalPurchaseRow | null>(null)
  const [rowPendingArchive, setRowPendingArchive] = useState<GlobalPurchaseRow | null>(null)
  const [savingRowId, setSavingRowId] = useState<string | null>(null)
  const purchaseGroups = useMemo(() => groupPurchasesByProject(purchases), [purchases])

  useEffect(() => {
    const handleCreate = () => {
      setReplacementRow(null)
      setMaterialDialogOpen(true)
    }
    window.addEventListener(GLOBAL_PURCHASES_CREATE_EVENT, handleCreate)
    return () => window.removeEventListener(GLOBAL_PURCHASES_CREATE_EVENT, handleCreate)
  }, [])

  useEffect(() => {
    const handleImport = () => setImportDialogOpen(true)
    window.addEventListener(GLOBAL_PURCHASES_IMPORT_EVENT, handleImport)
    return () => window.removeEventListener(GLOBAL_PURCHASES_IMPORT_EVENT, handleImport)
  }, [])

  const handleDelete = (purchase: GlobalPurchaseRow) => {
    setRowPendingArchive(purchase)
  }

  const handleConfirmArchive = async () => {
    if (!rowPendingArchive) return

    setSavingRowId(rowPendingArchive.id)
    try {
      await archivePurchase(rowPendingArchive.id)
      setRowPendingArchive(null)
    } finally {
      setSavingRowId(null)
    }
  }

  const handleReplace = (purchase: GlobalPurchaseRow) => {
    setReplacementRow(purchase)
    setMaterialDialogOpen(true)
  }

  const handleUpdate = async (purchase: GlobalPurchaseRow, input: GlobalPurchaseMutationInput) => {
    setSavingRowId(purchase.id)
    try {
      await updatePurchase(purchase.id, input)
    } finally {
      setSavingRowId(null)
    }
  }

  const handleSelectMaterial = async (input: GlobalPurchaseMutationInput) => {
    if (!replacementRow) {
      await createPurchase(input)
      return
    }

    setSavingRowId(replacementRow.id)
    try {
      await updatePurchase(replacementRow.id, buildReplaceInput(replacementRow, input))
      setReplacementRow(null)
    } finally {
      setSavingRowId(null)
    }
  }

  const handleImportPurchase = async (input: GlobalPurchaseMutationInput) => {
    await createPurchase(input)
  }

  const handleMaterialDialogOpenChange = (open: boolean) => {
    setMaterialDialogOpen(open)
    if (!open) setReplacementRow(null)
  }

  const currentCursor = params.cursor ?? 0
  const currentLimit = params.limit ?? meta?.limit ?? DEFAULT_LIMIT
  const pageStart = purchases.length > 0 ? currentCursor + 1 : 0
  const pageEnd = currentCursor + purchases.length
  const totalLabel = meta?.hasMore ? `минимум ${meta.total}` : String(meta?.total ?? purchases.length)
  const previousCursor = Math.max(currentCursor - currentLimit, 0)
  const nextCursor = meta?.nextCursor ?? currentCursor + currentLimit
  const showSkeletonRows = loading && purchases.length === 0
  const isReplacing = Boolean(replacementRow)
  const archiveInProgress = rowPendingArchive ? savingRowId === rowPendingArchive.id || saving : false

  return (
    <>
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg py-0 shadow-sm">
        {error ? <FieldError className="m-3 mb-0 rounded-md border border-destructive/30 bg-destructive/10 p-3">{error}</FieldError> : null}
        <CardContent className="scrollbar-subtle relative min-h-0 flex-1 overflow-y-auto px-0 py-0">
          {showSkeletonRows ? <GlobalPurchasesRowsSkeleton /> : null}
          {!showSkeletonRows && purchases.length === 0 ? <Empty className="h-full border-0"><EmptyHeader><EmptyTitle>Закупки не найдены</EmptyTitle><EmptyDescription>Добавьте закупку из справочника материалов или измените поиск.</EmptyDescription></EmptyHeader></Empty> : null}
          {!showSkeletonRows ? purchaseGroups.map((group) => (
            <section key={group.key} className="py-1">
              <div className="sticky top-0 z-10 mx-3 mb-1 flex items-center gap-2 rounded-md border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
                <span className="truncate">{group.title}</span>
                <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px] font-normal">{group.rows.length}</Badge>
              </div>
              {group.rows.map((row) => <GlobalPurchasesRow key={row.id} onDelete={handleDelete} onReplace={handleReplace} onUpdate={handleUpdate} projects={projects} row={row} saving={savingRowId === row.id || projectsLoading} />)}
            </section>
          )) : null}
        </CardContent>
        {meta ? <CardFooter className="flex flex-col gap-3 border-t p-3 text-xs/relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><div>Показано {pageStart}–{pageEnd}. Всего: {totalLabel}</div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={currentCursor === 0 || loading || isFetching} onClick={() => setCursor(previousCursor)}>Назад</Button><Button type="button" size="sm" variant="outline" disabled={!meta.hasMore || loading || isFetching} onClick={() => setCursor(nextCursor)}>Вперёд</Button></div></CardFooter> : null}
      </Card>
      <Dialog open={Boolean(rowPendingArchive)} onOpenChange={(open) => !open && setRowPendingArchive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить закупку?</DialogTitle>
            <DialogDescription>
              {rowPendingArchive
                ? `Закупка «${rowPendingArchive.title}» исчезнет из обычного списка. Данные останутся в архиве.`
                : "Закупка исчезнет из обычного списка. Данные останутся в архиве."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={archiveInProgress}
              onClick={() => setRowPendingArchive(null)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={archiveInProgress}
              onClick={handleConfirmArchive}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <GlobalPurchaseMaterialDialog
        actionLabel={isReplacing ? "Заменить" : "Добавить"}
        closeOnSelect={isReplacing}
        description={isReplacing ? "Выберите новый материал. Объект, дата и фактические значения сохранятся." : undefined}
        onOpenChange={handleMaterialDialogOpenChange}
        onSelect={handleSelectMaterial}
        open={materialDialogOpen}
        quantityPrompt={!isReplacing}
        saving={saving || savingRowId !== null}
        title={isReplacing ? "Заменить материал в закупке" : undefined}
      />
      <GlobalPurchasesImportDialog
        onImport={handleImportPurchase}
        onOpenChange={setImportDialogOpen}
        open={importDialogOpen}
        projects={projects}
        saving={saving}
      />
    </>
  )
}
