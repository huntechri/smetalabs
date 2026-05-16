"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useDirectoryMaterials } from "@/features/directory-materials/hooks/use-directory-materials"
import {
  DIRECTORY_MATERIALS_CREATE_EVENT,
  DIRECTORY_MATERIALS_IMPORT_EVENT,
} from "@/features/directory-materials/lib/directory-materials-events"
import type {
  DirectoryMaterial,
  DirectoryMaterialMutationInput,
} from "@/features/directory-materials/types"
import { DirectoryMaterialFormDialog } from "./directory-material-form-dialog"
import { DirectoryMaterialImportDialog } from "./directory-material-import-dialog"
import { DirectoryMaterialsRow } from "./directory-materials-row"

function DirectoryMaterialsRowsSkeleton() {
  return (
    <div className="flex flex-col divide-y">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="m-3 grid gap-3 rounded-md border p-3 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]">
          <div className="flex min-w-0 flex-col gap-3 p-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="grid min-w-0 gap-1.5 p-1.5 md:grid-cols-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DirectoryMaterialsSection() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
    appendImportBatch,
    applyImportJob,
    archiveMaterial,
    createImportJob,
    createMaterial,
    error,
    importing,
    isFetching,
    loading,
    materials,
    meta,
    saving,
    updateMaterial,
  } = useDirectoryMaterials()
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<DirectoryMaterial | null>(null)

  useEffect(() => {
    const handleCreate = () => {
      setSelectedMaterial(null)
      setFormOpen(true)
    }
    const handleImport = () => setImportOpen(true)

    window.addEventListener(DIRECTORY_MATERIALS_CREATE_EVENT, handleCreate)
    window.addEventListener(DIRECTORY_MATERIALS_IMPORT_EVENT, handleImport)
    return () => {
      window.removeEventListener(DIRECTORY_MATERIALS_CREATE_EVENT, handleCreate)
      window.removeEventListener(DIRECTORY_MATERIALS_IMPORT_EVENT, handleImport)
    }
  }, [])

  const goToCursor = (cursor: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cursor <= 0) params.delete("cursor")
    else params.set("cursor", String(cursor))
    router.push(params.toString() ? `${pathname}?${params}` : pathname)
  }

  const handleEdit = (material: DirectoryMaterial) => {
    setSelectedMaterial(material)
    setFormOpen(true)
  }

  const handleArchive = async (material: DirectoryMaterial) => {
    const confirmed = window.confirm(`Архивировать материал «${material.name}»? Он исчезнет из активного списка.`)
    if (!confirmed) return
    await archiveMaterial(material.id)
  }

  const handleSubmit = async (input: DirectoryMaterialMutationInput) => {
    if (selectedMaterial) {
      await updateMaterial(selectedMaterial.id, input)
      return
    }
    await createMaterial(input)
  }

  const hasPreviousPage = Boolean(meta && meta.cursor > 0)
  const previousCursor = meta ? Math.max(0, meta.cursor - meta.limit) : 0
  const currentPage = meta ? Math.floor(meta.cursor / meta.limit) + 1 : 1

  const dialogs = (
    <>
      <DirectoryMaterialFormDialog
        material={selectedMaterial}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        open={formOpen}
        saving={saving}
      />
      <DirectoryMaterialImportDialog
        importing={importing}
        onAppendBatch={appendImportBatch}
        onApplyJob={applyImportJob}
        onCreateJob={createImportJob}
        onOpenChange={setImportOpen}
        open={importOpen}
      />
    </>
  )

  if (loading) {
    return (
      <>
        {dialogs}
        <section className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          <DirectoryMaterialsRowsSkeleton />
        </section>
      </>
    )
  }

  if (error) {
    return (
      <>
        {dialogs}
        <section className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm">
          <h2 className="text-base font-semibold">Не удалось загрузить материалы</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
        </section>
      </>
    )
  }

  if (materials.length === 0) {
    return (
      <>
        {dialogs}
        <section className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm">
          <h2 className="text-base font-semibold">Материалы не найдены</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">Добавьте первый материал вручную или измените поиск.</p>
        </section>
      </>
    )
  }

  return (
    <>
      {dialogs}
      <section className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
        {isFetching ? <div className="h-1 bg-muted" /> : null}
        <div className="flex flex-col divide-y">
          {materials.map((row) => (
            <DirectoryMaterialsRow key={row.id} onArchive={handleArchive} onEdit={handleEdit} row={row} />
          ))}
        </div>
        {meta ? (
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
            <span>Страница {currentPage}. Всего материалов: {meta.total}.</span>
            <div className="flex items-center gap-2">
              <Button disabled={!hasPreviousPage || isFetching} onClick={() => goToCursor(previousCursor)} type="button" variant="outline">Назад</Button>
              <Button disabled={!meta.hasMore || !meta.nextCursor || isFetching} onClick={() => meta.nextCursor !== null && goToCursor(meta.nextCursor)} type="button" variant="outline">Вперёд</Button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  )
}
