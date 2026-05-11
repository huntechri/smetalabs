"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SensitiveActionsCard() {
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
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Покинуть workspace</span>
            <span className="text-xs text-muted-foreground">
              Вы покинете текущее рабочее пространство и потеряете доступ к его
              данным
            </span>
          </div>
          <Button
            variant="destructive"
            onClick={() => alert("Покинуть workspace")}
          >
            Покинуть
          </Button>
        </div>
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              Передать права владельца
            </span>
            <span className="text-xs text-muted-foreground">
              Назначить другого участника владельцем workspace
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => alert("Передать права владельца")}
          >
            Передать
          </Button>
        </div>
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Деактивировать аккаунт</span>
            <span className="text-xs text-muted-foreground">
              Ваш аккаунт будет временно отключён до повторной активации
              администратором
            </span>
          </div>
          <Button
            variant="destructive"
            onClick={() => alert("Деактивировать аккаунт")}
          >
            Деактивировать
          </Button>
        </div>
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
