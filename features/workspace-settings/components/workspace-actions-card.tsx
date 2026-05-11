"use client"

import {
  Archive,
  ArrowRight,
  ArrowSquareOut,
  Trash,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function WorkspaceActionsCard() {
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
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
          >
            <ArrowSquareOut className="size-3.5" />
            Покинуть
          </Button>
        </div>

        {/* Transfer ownership */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/50 p-3">
          <div className="space-y-0.5">
            <p className="text-xs font-medium">Передать права владельца</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Передать права другому участнику workspace.
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <ArrowRight className="size-3.5" />
            Передать
          </Button>
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
