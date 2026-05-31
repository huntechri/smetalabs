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

type ResetPasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  onConfirm: () => void | Promise<void>
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  memberName,
  onConfirm,
}: ResetPasswordDialogProps) {
  const handleSubmit = async () => {
    await onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сбросить пароль</DialogTitle>
          <DialogDescription>
            Отправить ссылку для сброса пароля пользователю {memberName}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>Отправить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
