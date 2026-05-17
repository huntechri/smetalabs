"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { DirectorySupplier } from "@/features/directory-suppliers/types"
import { useDirectorySuppliers } from "@/features/directory-suppliers/hooks/use-directory-suppliers"
import { DirectorySuppliersFormDialog } from "./directory-suppliers-create-dialog"
import { DirectorySuppliersRow } from "./directory-suppliers-row"

const DEFAULT_LIMIT = 50
const SKELETON_ROW_COUNT = 6

function DirectorySuppliersRowSkeleton() {
  return (
    <div className="mx-3 my-1.5 grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
      <div className="min-w-0 rounded-md border border-border p-2">
        <Skeleton className="mb-2 h-3 w-16" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DirectorySuppliersRowsSkeleton() {
  return (
    <div aria-label="Загрузка поставщиков" aria-busy="true">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <DirectorySuppliersRowSkeleton key={index} />
      ))}
    </div>
  )
}

export function DirectorySuppliersSection() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
    archiveSupplier,
    createSupplier,
    error,
    isFetching,
    loading,
    meta,
    params,
    saving,
    suppliers,
    updateSupplier,
  } = useDirectorySuppliers()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingSupplier, setEditingSupplier] = React.useState<DirectorySupplier | null>(null)

  const handleEdit = (supplier: DirectorySupplier) => {
    setEditingSupplier(supplier)
    setDialogOpen(true)
  }

  const handleArchive = (supplier: DirectorySupplier) => {
    void archiveSupplier(supplier.id).catch(() => undefined)
  }

  const setCursor = (cursor: number) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (cursor > 0) nextParams.set("cursor", String(cursor))
    else nextParams.delete("cursor")
    const query = nextParams.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const currentCursor = params.cursor ?? 0
  const currentLimit = params.limit ?? meta?.limit ?? DEFAULT_LIMIT
  const pageStart = suppliers.length > 0 ? currentCursor + 1 : 0
  const pageEnd = currentCursor + suppliers.length
  const totalLabel = meta?.hasMore ? `минимум ${meta.total}` : String(meta?.total ?? suppliers.length)
  const previousCursor = Math.max(currentCursor - currentLimit, 0)
  const nextCursor = meta?.nextCursor ?? currentCursor + currentLimit
  const showSkeletonRows = loading || isFetching

  return (
    <>
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        {error ? (
          <div className="m-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs/relaxed text-destructive">
            {error}
          </div>
        ) : null}
        <div className="scrollbar-subtle relative min-h-0 flex-1 overflow-y-auto">
          {showSkeletonRows ? <DirectorySuppliersRowsSkeleton /> : null}
          {!showSkeletonRows && suppliers.length === 0 ? (
            <div className="p-4 text-xs/relaxed text-muted-foreground">
              Поставщики не найдены. Добавьте первого поставщика вручную или измените поиск.
            </div>
          ) : null}
          {!showSkeletonRows
            ? suppliers.map((row) => (
                <DirectorySuppliersRow
                  key={row.id}
                  onArchive={handleArchive}
                  onEdit={handleEdit}
                  row={row}
                  saving={saving || isFetching}
                />
              ))
            : null}
        </div>
        {meta ? (
          <div className="flex flex-col gap-3 border-t border-border p-3 text-xs/relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>Показано {pageStart}–{pageEnd}. Всего: {totalLabel}</div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" disabled={currentCursor === 0 || loading || isFetching} onClick={() => setCursor(previousCursor)}>Назад</Button>
              <Button type="button" size="sm" variant="outline" disabled={!meta.hasMore || loading || isFetching} onClick={() => setCursor(nextCursor)}>Вперёд</Button>
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
        saving={saving}
        supplier={editingSupplier}
        onSubmit={async (input) => {
          if (editingSupplier) await updateSupplier(editingSupplier.id, input)
          else await createSupplier(input)
          setDialogOpen(false)
          setEditingSupplier(null)
        }}
      />
    </>
  )
}
