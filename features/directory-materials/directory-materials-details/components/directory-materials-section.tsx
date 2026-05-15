"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useDirectoryMaterials } from "@/features/directory-materials/hooks/use-directory-materials"
import { DirectoryMaterialsRow } from "./directory-materials-row"

function DirectoryMaterialsRowsSkeleton() {
  return (
    <div className="flex flex-col divide-y">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="m-3 grid gap-3 rounded-md border p-3 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]"
        >
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
  const { materials, loading, error, isFetching } = useDirectoryMaterials()

  if (loading) {
    return (
      <section className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
        <DirectoryMaterialsRowsSkeleton />
      </section>
    )
  }

  if (error) {
    return (
      <section className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm">
        <h2 className="text-base font-semibold">Не удалось загрузить материалы</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
      </section>
    )
  }

  if (materials.length === 0) {
    return (
      <section className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm">
        <h2 className="text-base font-semibold">Материалы не найдены</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Добавьте первый материал вручную или измените поиск.
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      {isFetching ? <div className="h-1 bg-muted" /> : null}
      <div className="flex flex-col divide-y">
        {materials.map((row) => (
          <DirectoryMaterialsRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
