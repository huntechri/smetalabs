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

type RemoveMemberMember = {
  name: string
}

type RemoveMemberDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: RemoveMemberMember | null
  onConfirm: () => void | Promise<void>
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  onConfirm,
}: RemoveMemberDialogProps) {
  const handleSubmit = async () => {
    await onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить участника</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить {member?.name ?? "участника"} из
            workspace? Это действие нельзя отменить.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleSubmit}>
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
