"use client"

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

export function SensitiveActionsCard() {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Опасные действия</CardTitle>
        <CardDescription>
          Действия, которые могут повлиять на ваш аккаунт и рабочее
          пространство. Будьте осторожны.
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
              <Button
                variant="destructive"
                disabled
                title="Действие пока не реализовано"
              >
                Покинуть · скоро
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Покинуть workspace?</DialogTitle>
                <DialogDescription>
                  Вы потеряете доступ ко всем проектам, сметам и данным
                  workspace. Это действие нельзя отменить.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button variant="destructive" disabled>
                  Покинуть · скоро
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
              <Button
                variant="outline"
                disabled
                title="Действие пока не реализовано"
              >
                Передать · скоро
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
                <Button disabled>Подтвердить передачу · скоро</Button>
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
              <Button
                variant="destructive"
                disabled
                title="Действие пока не реализовано"
              >
                Деактивировать · скоро
              </Button>
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
                <Button variant="destructive" disabled>
                  Деактивировать · скоро
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
