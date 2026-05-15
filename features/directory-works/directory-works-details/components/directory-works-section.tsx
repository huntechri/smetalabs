"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { DirectoryWork } from "@/features/directory-works/types"
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

export function DirectoryWorksSection() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
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
  const [insertAfterWork, setInsertAfterWork] = useState<DirectoryWork | null>(null)

  useEffect(() => {
    const handleCreate = () => {
      setEditingWork(null)
      setInsertAfterWork(null)
      setDialogOpen(true)
    }
    const handleImport = () => {
      setImportDialogOpen(true)
    }
    const handleExport = () => {
      window.location.assign(buildDirectoryWorksExportHref("xlsx", params))
    }

    window.addEventListener(DIRECTORY_WORKS_CREATE_EVENT, handleCreate)
    window.addEventListener(DIRECTORY_WORKS_IMPORT_EVENT, handleImport)
    window.addEventListener(DIRECTORY_WORKS_EXPORT_EVENT, handleExport)
    return () => {
      window.removeEventListener(DIRECTORY_WORKS_CREATE_EVENT, handleCreate)
      window.removeEventListener(DIRECTORY_WORKS_IMPORT_EVENT, handleImport)
      window.removeEventListener(DIRECTORY_WORKS_EXPORT_EVENT, handleExport)
    }
  }, [params])

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
    if (cursor > 0) {
      nextParams.set("cursor", String(cursor))
    } else {
      nextParams.delete("cursor")
    }
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
  const showUpdatingIndicator = isFetching && !loading && works.length > 0

  return (
    <>
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        {error ? (
          <div className="m-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs/relaxed text-destructive">
            {error}
          </div>
        ) : null}

        <div className="scrollbar-subtle relative min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center gap-2 p-4 text-xs/relaxed text-muted-foreground">
              <Spinner className="size-4" />
              Загрузка работ...
            </div>
          ) : null}

          {!loading && works.length === 0 ? (
            <div className="p-4 text-xs/relaxed text-muted-foreground">
              Работы не найдены. Добавьте первую работу вручную или измените поиск.
            </div>
          ) : null}

          {works.map((row) => (
            <DirectoryWorksRow
              key={row.id}
              onArchive={handleArchive}
              onEdit={handleEdit}
              onInsertAfter={handleInsertAfter}
              row={row}
              saving={saving || isFetching}
            />
          ))}

          {showUpdatingIndicator ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-md border border-border bg-card/95 px-3 py-2 text-xs/relaxed text-muted-foreground shadow-sm">
                <Spinner className="size-4" />
                Обновление списка...
              </div>
            </div>
          ) : null}
        </div>

        {meta ? (
          <div className="flex flex-col gap-3 border-t border-border p-3 text-xs/relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              Показано {pageStart}–{pageEnd}. Всего: {totalLabel}
              {isFetching ? " · обновление..." : ""}
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
          if (editingWork) {
            await updateWork(editingWork.id, input)
          } else {
            await createWork({
              ...input,
              insertAfterWorkId: insertAfterWork?.id ?? null,
            })
          }
          setDialogOpen(false)
          setEditingWork(null)
          setInsertAfterWork(null)
        }}
      />

      <DirectoryWorkImportDialog
        importing={importing}
        onApplyJob={async (id) => {
          await applyImportJob(id)
        }}
        onCreateJob={createImportJob}
        onOpenChange={setImportDialogOpen}
        open={importDialogOpen}
      />
    </>
  )
}
