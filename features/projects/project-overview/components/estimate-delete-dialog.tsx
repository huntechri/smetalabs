"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { EstimateRow } from "@/features/projects/project-overview/types"

export function EstimateDeleteDialog({
  estimate,
  saving,
  error,
  onOpenChange,
  onConfirm,
}: {
  estimate: EstimateRow | null
  saving?: boolean
  error?: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={Boolean(estimate)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Удалить смету?</DialogTitle>
        </DialogHeader>

        <div className="text-xs/relaxed text-muted-foreground">
          Смета {estimate ? `«${estimate.name}»` : ""} будет удалена из списка проекта.
        </div>

        {error ? <div className="text-xs text-destructive">{error}</div> : null}

        <DialogFooter showCloseButton={false}>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" variant="destructive" disabled={saving} onClick={onConfirm}>
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
