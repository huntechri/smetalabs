"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { GlobalPurchaseRow } from "@/types/global-purchases"

export function GlobalPurchaseArchiveDialog({
  onConfirm,
  onOpenChange,
  open,
  purchase,
  saving,
}: {
  onConfirm: () => Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  purchase: GlobalPurchaseRow | null
  saving: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить закупку?</DialogTitle>
          <DialogDescription>
            {purchase
              ? `Закупка «${purchase.title}» исчезнет из обычного списка. Данные останутся в архиве.`
              : "Закупка исчезнет из обычного списка. Данные останутся в архиве."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
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
