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
import { useDirectoryCounterparties } from "@/features/directory-counterparties/hooks/use-directory-counterparties"
import { DIRECTORY_COUNTERPARTIES_CREATE_EVENT } from "@/features/directory-counterparties/lib/directory-counterparties-events"
import type {
  DirectoryCounterparty,
  DirectoryCounterpartyMutationInput,
} from "@/features/directory-counterparties/types"
import { DirectoryCounterpartiesCreateDialog } from "./directory-counterparties-create-dialog"
import { DirectoryCounterpartiesRow } from "./directory-counterparties-row"

const DEFAULT_LIMIT = 50
const SKELETON_ROW_COUNT = 6

function DirectoryCounterpartiesRowsSkeleton() {
  return (
    <div aria-label="Загрузка контрагентов" aria-busy="true">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <Card
          key={index}
          size="sm"
          className="mx-3 my-1.5 rounded-md bg-transparent p-0"
        >
          <CardContent className="grid min-w-0 gap-3 p-3 xl:grid-cols-[minmax(420px,1fr)_minmax(560px,0.95fr)]">
            <div className="min-w-0 rounded-md border border-border p-2">
              <Skeleton className="mb-2 h-3 w-24" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </div>
            <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-3">
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DirectoryCounterpartiesSection() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
    archiveCounterparty,
    counterparties,
    createCounterparty,
    error,
    isFetching,
    loading,
    meta,
    params,
    saving,
    updateCounterparty,
  } = useDirectoryCounterparties()
  const [formOpen, setFormOpen] = useState(false)
  const [selectedCounterparty, setSelectedCounterparty] =
    useState<DirectoryCounterparty | null>(null)

  useEffect(() => {
    const handleCreate = () => {
      setSelectedCounterparty(null)
      setFormOpen(true)
    }

    window.addEventListener(DIRECTORY_COUNTERPARTIES_CREATE_EVENT, handleCreate)
    return () =>
      window.removeEventListener(
        DIRECTORY_COUNTERPARTIES_CREATE_EVENT,
        handleCreate
      )
  }, [])

  const setCursor = (cursor: number) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (cursor > 0) nextParams.set("cursor", String(cursor))
    else nextParams.delete("cursor")
    const query = nextParams.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleArchive = async (counterparty: DirectoryCounterparty) => {
    const confirmed = window.confirm(
      `Архивировать контрагента «${counterparty.name}»? Он исчезнет из активного списка.`
    )
    if (!confirmed) return
    await archiveCounterparty(counterparty.id)
  }

  const handleSubmit = async (input: DirectoryCounterpartyMutationInput) => {
    if (selectedCounterparty) {
      await updateCounterparty(selectedCounterparty.id, input)
      return
    }
    await createCounterparty(input)
  }

  const currentCursor = params.cursor ?? 0
  const currentLimit = params.limit ?? meta?.limit ?? DEFAULT_LIMIT
  const pageStart = counterparties.length > 0 ? currentCursor + 1 : 0
  const pageEnd = currentCursor + counterparties.length
  const totalLabel = meta?.hasMore
    ? `минимум ${meta.total}`
    : String(meta?.total ?? counterparties.length)
  const previousCursor = Math.max(currentCursor - currentLimit, 0)
  const nextCursor = meta?.nextCursor ?? currentCursor + currentLimit
  const showSkeletonRows = loading || isFetching

  return (
    <>
      <Card className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-muted/0 py-0 shadow-sm">
        <FieldError className="m-3 mb-0 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          {error}
        </FieldError>
        <CardContent className="scrollbar-subtle relative min-h-0 flex-1 overflow-y-auto px-0 py-0">
          {showSkeletonRows ? <DirectoryCounterpartiesRowsSkeleton /> : null}
          {!showSkeletonRows && counterparties.length === 0 ? (
            <Empty className="h-full border-0">
              <EmptyHeader>
                <EmptyTitle>Контрагенты не найдены</EmptyTitle>
                <EmptyDescription>
                  Добавьте первого контрагента вручную или измените поиск.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {!showSkeletonRows
            ? counterparties.map((row) => (
                <DirectoryCounterpartiesRow
                  key={row.id}
                  onArchive={handleArchive}
                  onEdit={(counterparty) => {
                    setSelectedCounterparty(counterparty)
                    setFormOpen(true)
                  }}
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

      <DirectoryCounterpartiesCreateDialog
        counterparty={selectedCounterparty}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setSelectedCounterparty(null)
        }}
        onSubmit={async (input) => {
          await handleSubmit(input)
          setFormOpen(false)
          setSelectedCounterparty(null)
        }}
        open={formOpen}
        saving={saving}
      />
    </>
  )
}
