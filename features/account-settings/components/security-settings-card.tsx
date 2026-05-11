"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockSecurity } from "../__mocks__/account-settings"

export function SecuritySettingsCard() {
  const security = mockSecurity

  const formattedLastLogin = new Date(security.lastLogin).toLocaleString(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Безопасность</CardTitle>
        <CardDescription>
          Управление паролем и параметрами безопасности аккаунта
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Пароль</span>
            <span className="text-xs text-muted-foreground">
              Измените пароль для входа в аккаунт
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => alert("Смена пароля")}
          >
            Сменить пароль
          </Button>
        </div>
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              Двухфакторная аутентификация
            </span>
            <span className="text-xs text-muted-foreground">
              Дополнительная защита вашего аккаунта
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={security.twoFactorEnabled ? "default" : "secondary"}
            >
              {security.twoFactorEnabled ? "Включена" : "Выключена"}
            </Badge>
            <Button
              variant="outline"
              onClick={() => alert("Настройка 2FA")}
            >
              Настроить
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Активные сессии</span>
            <span className="text-xs text-muted-foreground">
              Устройства, на которых выполнен вход
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {security.activeSessionsCount} устройств
            </span>
            <Button
              variant="outline"
              onClick={() => alert("Управление сессиями")}
            >
              Управлять
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Последний вход</span>
            <span className="text-xs text-muted-foreground">
              Дата и время последней авторизации
            </span>
          </div>
          <span className="text-xs">{formattedLastLogin}</span>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button
          onClick={() => console.log("Save security settings")}
        >
          Сохранить
        </Button>
      </CardFooter>
    </Card>
  )
}
