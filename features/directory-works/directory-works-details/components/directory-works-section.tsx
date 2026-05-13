"use client"

import { useEffect, useState } from "react"
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

export function DirectoryWorksSection() {
  const {
    applyImportJob,
    archiveWork,
    createImportJob,
    createWork,
    error,
    importing,
    isFetching,
    loading,
    params,
    saving,
    updateWork,
    works,
  } = useDirectoryWorks()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingWork, setEditingWork] = useState<DirectoryWork | null>(null)

  useEffect(() => {
    const handleCreate = () => {
      setEditingWork(null)
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
    setDialogOpen(true)
  }

  const handleArchive = (work: DirectoryWork) => {
    void archiveWork(work.id).catch(() => undefined)
  }

  return (
    <>
      <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
        {error ? (
          <div className="m-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Загрузка работ...</div>
        ) : null}

        {!loading && works.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            Работы не найдены. Добавьте первую работу вручную или измените поиск.
          </div>
        ) : null}

        <div className="flex flex-col">
          {works.map((row) => (
            <DirectoryWorksRow
              key={row.id}
              onArchive={handleArchive}
              onEdit={handleEdit}
              row={row}
              saving={saving || isFetching}
            />
          ))}
        </div>
      </section>

      <DirectoryWorkFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        saving={saving}
        work={editingWork}
        onSubmit={async (input) => {
          if (editingWork) {
            await updateWork(editingWork.id, input)
          } else {
            await createWork(input)
          }
          setDialogOpen(false)
          setEditingWork(null)
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
