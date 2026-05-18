"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { GlobalPurchaseMutationInput, GlobalPurchaseRow } from "@/types/global-purchases"
import type { ProjectRow } from "@/types/project"
import { GlobalPurchasesRow } from "./global-purchases-row"

const SKELETON_ROW_COUNT = 6

function GlobalPurchasesRowSkeleton() {
  return (
    <Card size="sm" className="mx-3 my-1.5 rounded-md bg-transparent p-0">
      <CardContent className="grid gap-2 p-2 xl:grid-cols-[minmax(460px,2fr)_76px_minmax(150px,0.55fr)_minmax(230px,0.85fr)_minmax(240px,0.85fr)]">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-2 rounded-md border border-border p-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function GlobalPurchasesRowsSkeleton() {
  return (
    <div aria-label="Загрузка закупок" aria-busy="true">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <GlobalPurchasesRowSkeleton key={index} />
      ))}
    </div>
  )
}

type PurchaseGroup = {
  key: string
  title: string
  rows: GlobalPurchaseRow[]
}

function groupPurchasesByProject(rows: GlobalPurchaseRow[]): PurchaseGroup[] {
  const groups = new Map<string, PurchaseGroup>()

  for (const row of rows) {
    const key = row.projectId ?? "without-project"
    const title = row.projectTitle ?? "Без объекта"
    const group = groups.get(key)

    if (group) group.rows.push(row)
    else groups.set(key, { key, title, rows: [row] })
  }

  return Array.from(groups.values())
}

export function GlobalPurchasesList({
  loading,
  onDelete,
  onReplace,
  onUpdate,
  projects,
  projectsLoading,
  purchases,
  savingRowId,
}: {
  loading: boolean
  onDelete: (row: GlobalPurchaseRow) => void
  onReplace: (row: GlobalPurchaseRow) => void
  onUpdate: (purchase: GlobalPurchaseRow, input: GlobalPurchaseMutationInput) => Promise<void>
  projects: ProjectRow[]
  projectsLoading: boolean
  purchases: GlobalPurchaseRow[]
  savingRowId: string | null
}) {
  const purchaseGroups = useMemo(() => groupPurchasesByProject(purchases), [purchases])
  const showSkeletonRows = loading && purchases.length === 0

  if (showSkeletonRows) return <GlobalPurchasesRowsSkeleton />

  if (purchases.length === 0) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyTitle>Закупки не найдены</EmptyTitle>
          <EmptyDescription>Добавьте закупку из справочника материалов или измените поиск.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      {purchaseGroups.map((group) => (
        <section key={group.key} className="py-1">
          <div className="sticky top-0 z-10 mx-3 mb-1 flex items-center gap-2 rounded-md border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <span className="truncate">{group.title}</span>
            <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px] font-normal">
              {group.rows.length}
            </Badge>
          </div>
          {group.rows.map((row) => (
            <GlobalPurchasesRow
              key={row.id}
              onDelete={onDelete}
              onReplace={onReplace}
              onUpdate={onUpdate}
              projects={projects}
              row={row}
              saving={savingRowId === row.id || projectsLoading}
            />
          ))}
        </section>
      ))}
    </>
  )
}
