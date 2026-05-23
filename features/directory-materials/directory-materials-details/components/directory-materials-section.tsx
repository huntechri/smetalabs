"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { FieldError } from "@/components/ui/field"
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

const DEFAULT_LIMIT = 50
const SKELETON_ROW_COUNT = 6

function DirectoryMaterialsRowSkeleton() {
  return (
    <Card size="sm" className="mx-3 my-1.5 rounded-md bg-transparent p-0">
      <CardContent className="grid min-w-0 gap-3 p-3 xl:grid-cols-[minmax(520px,1.15fr)_minmax(520px,0.85fr)]">
        <div className="grid min-w-0 gap-3 rounded-md border border-border p-2 sm:grid-cols-[minmax(96px,0.18fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
        <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-[minmax(220px,0.75fr)_minmax(280px,1fr)]">
          <div className="min-w-0 space-y-1.5 rounded-md border border-border p-1.5">
            <Skeleton className="h-3 w-24" />
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
          </div>
          <div className="min-w-0 space-y-1.5 rounded-md border border-border p-1.5">
            <Skeleton className="h-3 w-32" />
            <div className="flex min-w-0 items-center gap-1.5">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="ml-auto size-6 rounded-md" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DirectoryMaterialsRowsSkeleton() {
  return (
    <div aria-label="Загрузка материалов" aria-busy="true">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <DirectoryMaterialsRowSkeleton key={index} />
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
    params,
    saving,
    updateMaterial,
  } = useDirectoryMaterials()
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] =
    useState<DirectoryMaterial | null>(null)
  const [insertAfterMaterial, setInsertAfterMaterial] =
    useState<DirectoryMaterial | null>(null)

  useEffect(() => {
    const handleCreate = () => {
      setSelectedMaterial(null)
      setInsertAfterMaterial(null)
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

  const setCursor = (cursor: number) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (cursor > 0) nextParams.set("cursor", String(cursor))
    else nextParams.delete("cursor")
    const query = nextParams.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleEdit = (material: DirectoryMaterial) => {
    setSelectedMaterial(material)
    setInsertAfterMaterial(null)
    setFormOpen(true)
  }

  const handleInsertAfter = (material: DirectoryMaterial) => {
    setSelectedMaterial(null)
    setInsertAfterMaterial(material)
    setFormOpen(true)
  }

  const handleArchive = async (material: DirectoryMaterial) => {
    const confirmed = window.confirm(
      `Архивировать материал «${material.name}»? Он исчезнет из активного списка.`
    )
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

  const currentCursor = params.cursor ?? 0
  const currentLimit = params.limit ?? meta?.limit ?? DEFAULT_LIMIT
  const pageStart = materials.length > 0 ? currentCursor + 1 : 0
  const pageEnd = currentCursor + materials.length
  const totalLabel = meta?.hasMore
    ? `минимум ${meta.total}`
    : String(meta?.total ?? materials.length)
  const previousCursor = Math.max(currentCursor - currentLimit, 0)
  const nextCursor = meta?.nextCursor ?? currentCursor + currentLimit
  const showSkeletonRows = loading || isFetching

  return (
    <>
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg py-0 shadow-sm">
        <FieldError className="m-3 mb-0 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          {error}
        </FieldError>
        <CardContent className="scrollbar-subtle relative min-h-0 flex-1 overflow-y-auto px-0 py-0">
          {showSkeletonRows ? <DirectoryMaterialsRowsSkeleton /> : null}
          {!showSkeletonRows && materials.length === 0 ? (
            <Empty className="h-full border-0">
              <EmptyHeader>
                <EmptyTitle>Материалы не найдены</EmptyTitle>
                <EmptyDescription>
                  Добавьте первый материал вручную или измените поиск.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {!showSkeletonRows
            ? materials.map((row) => (
                <DirectoryMaterialsRow
                  key={row.id}
                  onArchive={handleArchive}
                  onEdit={handleEdit}
                  onInsertAfter={handleInsertAfter}
                  row={row}
                  saving={saving || isFetching}
                />
              ))
            : null}
        </CardContent>
        {meta ? (
          <CardFooter className="flex flex-col gap-3 border-t p-3 text-xs/relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
          </CardFooter>
        ) : null}
      </Card>

      <DirectoryMaterialFormDialog
        material={selectedMaterial}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setInsertAfterMaterial(null)
        }}
        onSubmit={async (input) => {
          await handleSubmit(input)
          setFormOpen(false)
          setSelectedMaterial(null)
          setInsertAfterMaterial(null)
        }}
        open={formOpen}
        saving={saving}
        title={insertAfterMaterial ? "Новый материал ниже" : undefined}
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
}
