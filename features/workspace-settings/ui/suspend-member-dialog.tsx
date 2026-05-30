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

type SuspendMemberDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  suspend: boolean
  onConfirm: () => void | Promise<void>
}

export function SuspendMemberDialog({
  open,
  onOpenChange,
  memberName,
  suspend,
  onConfirm,
}: SuspendMemberDialogProps) {
  const handleSubmit = async () => {
    await onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {suspend ? "Заблокировать участника" : "Разблокировать участника"}
          </DialogTitle>
          <DialogDescription>
            {suspend
              ? `Пользователь ${memberName} потеряет доступ к workspace. Вы уверены?`
              : `Восстановить доступ пользователю ${memberName}?`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            variant={suspend ? "destructive" : "default"}
            onClick={handleSubmit}
          >
            {suspend ? "Заблокировать" : "Разблокировать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
