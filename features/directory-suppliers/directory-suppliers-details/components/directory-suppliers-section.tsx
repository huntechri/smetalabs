"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { DirectorySupplier } from "@/features/directory-suppliers/types"
import { useDirectorySuppliers } from "@/features/directory-suppliers/hooks/use-directory-suppliers"
import { DIRECTORY_SUPPLIERS_CREATE_EVENT } from "@/features/directory-suppliers/lib/directory-suppliers-events"
import { DirectorySuppliersFormDialog } from "./directory-suppliers-create-dialog"
import { DirectorySuppliersRow } from "./directory-suppliers-row"

const DEFAULT_LIMIT = 50

export function DirectorySuppliersRowsSkeleton() {
  return (
    <div aria-label="Загрузка поставщиков" aria-busy="true" className="p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="mb-2 rounded-md border border-border p-3">
          <Skeleton className="mb-2 h-3 w-16" />
          <Skeleton className="h-5 w-full max-w-lg" />
        </div>
      ))}
    </div>
  )
}

export function DirectorySuppliersSection() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supplierState = useDirectorySuppliers()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] =
    useState<DirectorySupplier | null>(null)

  useEffect(() => {
    const handleCreate = () => {
      setEditingSupplier(null)
      setDialogOpen(true)
    }
    window.addEventListener(DIRECTORY_SUPPLIERS_CREATE_EVENT, handleCreate)
    return () =>
      window.removeEventListener(DIRECTORY_SUPPLIERS_CREATE_EVENT, handleCreate)
  }, [])

  const setCursor = (cursor: number) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (cursor > 0) nextParams.set("cursor", String(cursor))
    else nextParams.delete("cursor")
    const query = nextParams.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const currentCursor = supplierState.params.cursor ?? 0
  const currentLimit =
    supplierState.params.limit ?? supplierState.meta?.limit ?? DEFAULT_LIMIT
  const previousCursor = Math.max(currentCursor - currentLimit, 0)
  const nextCursor =
    supplierState.meta?.nextCursor ?? currentCursor + currentLimit
  const isLoadingList = supplierState.loading || supplierState.isFetching

  return (
    <>
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        {supplierState.error ? (
          <div className="m-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs/relaxed text-destructive">
            {supplierState.error}
          </div>
        ) : null}
        <div className="scrollbar-subtle relative min-h-0 flex-1 overflow-y-auto">
          {isLoadingList ? <DirectorySuppliersRowsSkeleton /> : null}
          {!isLoadingList && supplierState.suppliers.length === 0 ? (
            <div className="p-4 text-xs/relaxed text-muted-foreground">
              Поставщики не найдены. Добавьте первого поставщика вручную или
              измените поиск.
            </div>
          ) : null}
          {!isLoadingList
            ? supplierState.suppliers.map((row) => (
                <DirectorySuppliersRow
                  key={row.id}
                  onArchive={(supplier) =>
                    void supplierState
                      .archiveSupplier(supplier.id)
                      .catch(() => undefined)
                  }
                  onEdit={(supplier) => {
                    setEditingSupplier(supplier)
                    setDialogOpen(true)
                  }}
                  row={row}
                  saving={supplierState.saving || supplierState.isFetching}
                />
              ))
            : null}
        </div>
        {supplierState.meta ? (
          <div className="flex flex-col gap-3 border-t border-border p-3 text-xs/relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              Показано{" "}
              {supplierState.suppliers.length > 0 ? currentCursor + 1 : 0}–
              {currentCursor + supplierState.suppliers.length}. Всего:{" "}
              {supplierState.meta.total}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentCursor === 0 || isLoadingList}
                onClick={() => setCursor(previousCursor)}
              >
                Назад
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!supplierState.meta.hasMore || isLoadingList}
                onClick={() => setCursor(nextCursor)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        ) : null}
      </section>
      <DirectorySuppliersFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingSupplier(null)
        }}
        saving={supplierState.saving}
        supplier={editingSupplier}
        onSubmit={async (input) => {
          if (editingSupplier)
            await supplierState.updateSupplier(editingSupplier.id, input)
          else await supplierState.createSupplier(input)
          setDialogOpen(false)
          setEditingSupplier(null)
        }}
      />
    </>
  )
}
