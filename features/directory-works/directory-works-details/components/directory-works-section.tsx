"use client"

import { useEffect, useState } from "react"
import type { DirectoryWork } from "@/features/directory-works/types"
import { useDirectoryWorks } from "@/features/directory-works/hooks/use-directory-works"
import { DIRECTORY_WORKS_CREATE_EVENT } from "@/features/directory-works/lib/directory-works-events"
import { DirectoryWorkFormDialog } from "./directory-work-form-dialog"
import { DirectoryWorksRow } from "./directory-works-row"

export function DirectoryWorksSection() {
  const {
    archiveWork,
    createWork,
    error,
    isFetching,
    loading,
    saving,
    updateWork,
    works,
  } = useDirectoryWorks()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWork, setEditingWork] = useState<DirectoryWork | null>(null)

  useEffect(() => {
    const handleCreate = () => {
      setEditingWork(null)
      setDialogOpen(true)
    }

    window.addEventListener(DIRECTORY_WORKS_CREATE_EVENT, handleCreate)
    return () =>
      window.removeEventListener(DIRECTORY_WORKS_CREATE_EVENT, handleCreate)
  }, [])

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
    </>
  )
}
