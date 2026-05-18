"use client"

import { Button } from "@/components/ui/button"
import { CardFooter } from "@/components/ui/card"

export function GlobalPurchasesPagination({
  currentCursor,
  currentLimit,
  disabled,
  hasMore,
  nextCursor,
  onCursorChange,
  pageEnd,
  pageStart,
  totalLabel,
}: {
  currentCursor: number
  currentLimit: number
  disabled: boolean
  hasMore: boolean
  nextCursor: number
  onCursorChange: (cursor: number) => void
  pageEnd: number
  pageStart: number
  totalLabel: string
}) {
  const previousCursor = Math.max(currentCursor - currentLimit, 0)

  return (
    <CardFooter className="flex flex-col gap-3 border-t p-3 text-xs/relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        Показано {pageStart}–{pageEnd}. Всего: {totalLabel}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={currentCursor === 0 || disabled}
          onClick={() => onCursorChange(previousCursor)}
        >
          Назад
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasMore || disabled}
          onClick={() => onCursorChange(nextCursor)}
        >
          Вперёд
        </Button>
      </div>
    </CardFooter>
  )
}
