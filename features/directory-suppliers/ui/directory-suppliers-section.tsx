"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useDirectorySuppliers } from "../application/use-directory-suppliers"
import {
  DIRECTORY_SUPPLIERS_CREATE_EVENT,
  type DirectorySupplier,
} from "../model/directory-suppliers-model"
import { DirectorySuppliersFormDialog } from "./directory-suppliers-create-dialog"
import { DirectorySuppliersRow } from "./directory-suppliers-row"

const DEFAULT_LIMIT = 50

export function DirectorySuppliersRowsSkeleton() {
  return (
    <div aria-label="Загрузка поставщиков" aria-busy="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="mx-3 my-1.5 grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]"
        >
          <div className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-2">
            <div className="min-w-0 rounded-md border border-border p-2">
              <Skeleton className="mb-2 h-3 w-24" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </div>
          </div>

          <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-[minmax(160px,1fr)_minmax(140px,1fr)_minmax(180px,1fr)]">
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-16 rounded-md" />
          </div>
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
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-muted/0 text-card-foreground shadow-sm">
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
