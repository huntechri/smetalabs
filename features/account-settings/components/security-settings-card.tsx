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
import { Skeleton } from "@/components/ui/skeleton"
import { useSettings } from "../hooks/use-account-settings"

export function SecuritySettingsCard() {
  const { settings, loading, error, refetch } = useSettings()

  const security = settings?.security

  const formattedLastLogin = security?.lastLogin
    ? new Date(security.lastLogin).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

  // ── Loading state ──
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3.5 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <div className="flex flex-col gap-0.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // ── Error state ──
  if (error && !security) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Безопасность</CardTitle>
          <CardDescription className="text-destructive">
            Ошибка загрузки: {error}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={refetch}>
            Повторить
          </Button>
        </CardFooter>
      </Card>
    )
  }

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
              variant={security?.twoFactorEnabled ? "default" : "secondary"}
            >
              {security?.twoFactorEnabled ? "Включена" : "Выключена"}
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
              {security?.activeSessionsCount ?? 0} устройств
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
    </Card>
  )
}
