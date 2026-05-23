"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { FieldError } from "@/components/ui/field"
import { useGlobalPurchases } from "@/features/global-purchases/hooks/use-global-purchases"
import {
  GLOBAL_PURCHASES_CREATE_EVENT,
  GLOBAL_PURCHASES_IMPORT_EVENT,
} from "@/features/global-purchases/lib/global-purchases-events"
import type {
  GlobalPurchaseMutationInput,
  GlobalPurchaseRow,
} from "@/types/global-purchases"
import type { ProjectRow } from "@/types/project"
import { GlobalPurchaseArchiveDialog } from "./global-purchase-archive-dialog"
import { GlobalPurchaseMaterialDialog } from "./global-purchase-material-dialog"
import { GlobalPurchasesImportDialog } from "./global-purchases-import-dialog"
import { GlobalPurchasesList } from "./global-purchases-list"
import { GlobalPurchasesPagination } from "./global-purchases-pagination"

const DEFAULT_LIMIT = 50

function buildReplaceInput(
  row: GlobalPurchaseRow,
  selected: GlobalPurchaseMutationInput
): GlobalPurchaseMutationInput {
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

export function GlobalPurchasesSection({
  projects,
  projectsLoading,
}: {
  projects: ProjectRow[]
  projectsLoading: boolean
}) {
  const {
    archivePurchase,
    createPurchase,
    error,
    isFetching,
    loading,
    meta,
    params,
    purchases,
    saving,
    setCursor,
    updatePurchase,
  } = useGlobalPurchases()
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [replacementRow, setReplacementRow] =
    useState<GlobalPurchaseRow | null>(null)
  const [rowPendingArchive, setRowPendingArchive] =
    useState<GlobalPurchaseRow | null>(null)
  const [savingRowId, setSavingRowId] = useState<string | null>(null)

  useEffect(() => {
    const handleCreate = () => {
      setReplacementRow(null)
      setMaterialDialogOpen(true)
    }
    window.addEventListener(GLOBAL_PURCHASES_CREATE_EVENT, handleCreate)
    return () =>
      window.removeEventListener(GLOBAL_PURCHASES_CREATE_EVENT, handleCreate)
  }, [])

  useEffect(() => {
    const handleImport = () => setImportDialogOpen(true)
    window.addEventListener(GLOBAL_PURCHASES_IMPORT_EVENT, handleImport)
    return () =>
      window.removeEventListener(GLOBAL_PURCHASES_IMPORT_EVENT, handleImport)
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

  const handleArchiveDialogOpenChange = (open: boolean) => {
    if (!open) setRowPendingArchive(null)
  }

  const handleReplace = (purchase: GlobalPurchaseRow) => {
    setReplacementRow(purchase)
    setMaterialDialogOpen(true)
  }

  const handleUpdate = async (
    purchase: GlobalPurchaseRow,
    input: GlobalPurchaseMutationInput
  ) => {
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
      await updatePurchase(
        replacementRow.id,
        buildReplaceInput(replacementRow, input)
      )
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
  const totalLabel = meta?.hasMore
    ? `минимум ${meta.total}`
    : String(meta?.total ?? purchases.length)
  const nextCursor = meta?.nextCursor ?? currentCursor + currentLimit
  const isReplacing = Boolean(replacementRow)
  const archiveInProgress = rowPendingArchive
    ? savingRowId === rowPendingArchive.id || saving
    : false

  return (
    <>
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg py-0 shadow-sm">
        {error ? (
          <FieldError className="m-3 mb-0 rounded-md border border-destructive/30 bg-destructive/10 p-3">
            {error}
          </FieldError>
        ) : null}
        <CardContent className="scrollbar-subtle relative min-h-0 flex-1 overflow-y-auto px-0 py-0">
          <GlobalPurchasesList
            loading={loading}
            onDelete={handleDelete}
            onReplace={handleReplace}
            onUpdate={handleUpdate}
            projects={projects}
            projectsLoading={projectsLoading}
            purchases={purchases}
            savingRowId={savingRowId}
          />
        </CardContent>
        {meta ? (
          <GlobalPurchasesPagination
            currentCursor={currentCursor}
            currentLimit={currentLimit}
            disabled={loading || isFetching}
            hasMore={meta.hasMore}
            nextCursor={nextCursor}
            onCursorChange={setCursor}
            pageEnd={pageEnd}
            pageStart={pageStart}
            totalLabel={totalLabel}
          />
        ) : null}
      </Card>
      <GlobalPurchaseArchiveDialog
        onConfirm={handleConfirmArchive}
        onOpenChange={handleArchiveDialogOpenChange}
        open={Boolean(rowPendingArchive)}
        purchase={rowPendingArchive}
        saving={archiveInProgress}
      />
      <GlobalPurchaseMaterialDialog
        actionLabel={isReplacing ? "Заменить" : "Добавить"}
        closeOnSelect={isReplacing}
        description={
          isReplacing
            ? "Выберите новый материал. Объект, дата и фактические значения сохранятся."
            : undefined
        }
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
