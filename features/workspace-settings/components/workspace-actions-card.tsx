"use client"

import { useState } from "react"
import {
  Archive,
  ArrowRight,
  ArrowSquareOut,
  Spinner,
  Trash,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

import { leaveWorkspaceAction, transferOwnershipAction } from "@/app/actions/team"

export function WorkspaceActionsCard() {
  const [leaving, setLeaving] = useState(false)
  const [transferring, setTransferring] = useState(false)

  async function handleLeave() {
    setLeaving(true)
    try {
      const result = await leaveWorkspaceAction()
      toast.success(result.message ?? "Вы покинули workspace")
    } catch (err: any) {
      toast.error(err?.message ?? "Ошибка при выходе из workspace")
    } finally {
      setLeaving(false)
    }
  }

  async function handleTransfer() {
    setTransferring(true)
    try {
      const result = await transferOwnershipAction({ userId: "" })
      toast.success(result.message ?? "Права переданы")
    } catch (err: any) {
      toast.error(err?.message ?? "Ошибка передачи прав")
    } finally {
      setTransferring(false)
    }
  }

  return (
    <Card className="border-dashed border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          Действия с workspace
        </CardTitle>
        <CardDescription>
          Необратимые операции. Будьте внимательны.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Leave workspace */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/50 p-3">
          <div className="space-y-0.5">
            <p className="text-xs font-medium">Покинуть workspace</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Вы потеряете доступ ко всем проектам и сметам.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              >
                <ArrowSquareOut className="size-3.5" />
                Покинуть
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Покинуть workspace?</DialogTitle>
                <DialogDescription>
                  Вы потеряете доступ ко всем проектам, сметам и данным workspace.
                  Это действие нельзя отменить.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button
                  variant="destructive"
                  onClick={handleLeave}
                  disabled={leaving}
                  className="gap-1.5"
                >
                  {leaving ? <Spinner className="size-3.5 animate-spin" /> : null}
                  {leaving ? "Выход..." : "Покинуть"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Transfer ownership */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/50 p-3">
          <div className="space-y-0.5">
            <p className="text-xs font-medium">Передать права владельца</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Передать права другому участнику workspace.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <ArrowRight className="size-3.5" />
                Передать
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Передать права владельца?</DialogTitle>
                <DialogDescription>
                  Вы передадите все права владельца выбранному участнику. После
                  передачи вы потеряете права владельца.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button
                  variant="default"
                  onClick={handleTransfer}
                  disabled={transferring}
                  className="gap-1.5"
                >
                  {transferring ? <Spinner className="size-3.5 animate-spin" /> : null}
                  Подтвердить передачу
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator className="border-dashed" />

        {/* Archive - disabled */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/50 p-3 opacity-50">
          <div className="space-y-0.5">
            <p className="text-xs font-medium">Архивировать workspace</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Workspace будет недоступен, но данные сохранятся.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled
          >
            <Archive className="size-3.5" />
            Архивировать
          </Button>
        </div>

        {/* Remove - disabled */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/50 p-3 opacity-50">
          <div className="space-y-0.5">
            <p className="text-xs font-medium">Удалить workspace</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Все данные будут безвозвратно удалены.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
            disabled
          >
            <Trash className="size-3.5" />
            Удалить
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
