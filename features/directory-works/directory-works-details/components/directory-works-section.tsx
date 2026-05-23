"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  DirectoryWork,
  DirectoryWorksListParams,
} from "@/features/directory-works/types"
import { buildDirectoryWorksExportHref } from "@/features/directory-works/api/directory-works-client"
import { useDirectoryWorks } from "@/features/directory-works/hooks/use-directory-works"
import {
  DIRECTORY_WORKS_CREATE_EVENT,
  DIRECTORY_WORKS_EXPORT_EVENT,
  DIRECTORY_WORKS_IMPORT_EVENT,
} from "@/features/directory-works/lib/directory-works-events"
import { DirectoryWorkFormDialog } from "./directory-work-form-dialog"
import { DirectoryWorkImportDialog } from "./directory-work-import-dialog"
import { DirectoryWorksRow } from "./directory-works-row"

const DEFAULT_LIMIT = 50
const SKELETON_ROW_COUNT = 6

function DirectoryWorksRowSkeleton() {
  return (
    <div className="mx-3 my-1.5 grid gap-3 rounded-md border border-border p-3 xl:grid-cols-[minmax(520px,1.15fr)_minmax(520px,0.85fr)]">
      <div className="grid min-w-0 gap-3 rounded-md border border-border p-2 sm:grid-cols-[minmax(96px,0.18fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-md border border-border p-2">
          <Skeleton className="mb-2 h-3 w-8" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="min-w-0 rounded-md border border-border p-2">
          <Skeleton className="mb-2 h-3 w-16" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
      <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-[minmax(220px,0.75fr)_minmax(280px,1fr)]">
        <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
          <Skeleton className="h-3 w-28" />
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
          <Skeleton className="h-3 w-16" />
          <div className="flex min-w-0 items-center gap-1.5">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="ml-auto size-6 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DirectoryWorksRowsSkeleton() {
  return (
    <div aria-label="Загрузка работ" aria-busy="true">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <DirectoryWorksRowSkeleton key={index} />
      ))}
    </div>
  )
}

export function DirectoryWorksSection() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
    appendImportBatch,
    applyImportJob,
    archiveWork,
    createImportJob,
    createWork,
    error,
    importing,
    isFetching,
    loading,
    meta,
    params,
    saving,
    updateWork,
    works,
  } = useDirectoryWorks()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingWork, setEditingWork] = useState<DirectoryWork | null>(null)
  const [insertAfterWork, setInsertAfterWork] = useState<DirectoryWork | null>(
    null
  )

  useEffect(() => {
    const handleCreate = () => {
      setEditingWork(null)
      setInsertAfterWork(null)
      setDialogOpen(true)
    }
    const handleImport = () => setImportDialogOpen(true)
    const handleExport = () => {
      const currentParams = Object.fromEntries(
        new URLSearchParams(window.location.search)
      ) as DirectoryWorksListParams
      window.location.assign(
        buildDirectoryWorksExportHref("csv", currentParams)
      )
    }

    window.addEventListener(DIRECTORY_WORKS_CREATE_EVENT, handleCreate)
    window.addEventListener(DIRECTORY_WORKS_IMPORT_EVENT, handleImport)
    window.addEventListener(DIRECTORY_WORKS_EXPORT_EVENT, handleExport)
    return () => {
      window.removeEventListener(DIRECTORY_WORKS_CREATE_EVENT, handleCreate)
      window.removeEventListener(DIRECTORY_WORKS_IMPORT_EVENT, handleImport)
      window.removeEventListener(DIRECTORY_WORKS_EXPORT_EVENT, handleExport)
    }
  }, [])

  const handleEdit = (work: DirectoryWork) => {
    setEditingWork(work)
    setInsertAfterWork(null)
    setDialogOpen(true)
  }

  const handleInsertAfter = (work: DirectoryWork) => {
    setEditingWork(null)
    setInsertAfterWork(work)
    setDialogOpen(true)
  }

  const handleArchive = (work: DirectoryWork) => {
    void archiveWork(work.id).catch(() => undefined)
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
  const pageStart = works.length > 0 ? currentCursor + 1 : 0
  const pageEnd = currentCursor + works.length
  const totalLabel = meta?.hasMore
    ? `минимум ${meta.total}`
    : String(meta?.total ?? works.length)
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
          {showSkeletonRows ? <DirectoryWorksRowsSkeleton /> : null}
          {!showSkeletonRows && works.length === 0 ? (
            <div className="p-4 text-xs/relaxed text-muted-foreground">
              Работы не найдены. Добавьте первую работу вручную или измените
              поиск.
            </div>
          ) : null}
          {!showSkeletonRows
            ? works.map((row) => (
                <DirectoryWorksRow
                  key={row.id}
                  onArchive={handleArchive}
                  onEdit={handleEdit}
                  onInsertAfter={handleInsertAfter}
                  row={row}
                  saving={saving || isFetching}
                />
              ))
            : null}
        </div>
        {meta ? (
          <div className="flex flex-col gap-3 border-t border-border p-3 text-xs/relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              Показано {pageStart}–{pageEnd}. Всего: {totalLabel}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentCursor === 0 || loading || isFetching}
                onClick={() => setCursor(previousCursor)}
              >
                Назад
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!meta.hasMore || loading || isFetching}
                onClick={() => setCursor(nextCursor)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <DirectoryWorkFormDialog
        insertAfterWork={insertAfterWork}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setInsertAfterWork(null)
        }}
        saving={saving}
        work={editingWork}
        onSubmit={async (input) => {
          if (editingWork) await updateWork(editingWork.id, input)
          else
            await createWork({
              ...input,
              insertAfterWorkId: insertAfterWork?.id ?? null,
            })
          setDialogOpen(false)
          setEditingWork(null)
          setInsertAfterWork(null)
        }}
      />
      <DirectoryWorkImportDialog
        importing={importing}
        onAppendBatch={appendImportBatch}
        onApplyJob={applyImportJob}
        onCreateJob={createImportJob}
        onOpenChange={setImportDialogOpen}
        open={importDialogOpen}
      />
    </>
  )
}
