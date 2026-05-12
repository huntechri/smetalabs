"use client"

import { useState } from "react"
import { Spinner } from "@phosphor-icons/react"
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

import {
  leaveWorkspaceAction,
  transferOwnershipAction,
  deactivateAccountAction,
} from "@/app/actions/team"

export function SensitiveActionsCard() {
  const [leaving, setLeaving] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

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

  async function handleDeactivate() {
    setDeactivating(true)
    try {
      const result = await deactivateAccountAction()
      toast.success(result.message ?? "Аккаунт деактивирован")
    } catch (err: any) {
      toast.error(err?.message ?? "Ошибка деактивации аккаунта")
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Опасные действия</CardTitle>
        <CardDescription>
          Действия, которые могут повлиять на ваш аккаунт и рабочее пространство.
          Будьте осторожны.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {/* Leave workspace */}
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Покинуть workspace</span>
            <span className="text-xs text-muted-foreground">
              Вы покинете текущее рабочее пространство и потеряете доступ к его
              данным
            </span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">Покинуть</Button>
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
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              Передать права владельца
            </span>
            <span className="text-xs text-muted-foreground">
              Назначить другого участника владельцем workspace
            </span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Передать</Button>
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

        {/* Deactivate account */}
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Деактивировать аккаунт</span>
            <span className="text-xs text-muted-foreground">
              Ваш аккаунт будет временно отключён до повторной активации
              администратором
            </span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">Деактивировать</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Деактивировать аккаунт?</DialogTitle>
                <DialogDescription>
                  Ваш аккаунт будет временно отключён. Вы не сможете войти до
                  повторной активации администратором.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={deactivating}
                  className="gap-1.5"
                >
                  {deactivating ? <Spinner className="size-3.5 animate-spin" /> : null}
                  {deactivating ? "Деактивация..." : "Деактивировать"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Delete workspace — disabled */}
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Удалить workspace</span>
            <span className="text-xs text-muted-foreground">
              Полное удаление рабочего пространства и всех связанных данных. Это
              действие необратимо.
            </span>
          </div>
          <Button variant="destructive" disabled>
            Удалить
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
