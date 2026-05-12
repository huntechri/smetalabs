"use client"

import { useState } from "react"
import { Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { useSettings } from "../hooks/use-account-settings"
import { resetPasswordAction } from "@/app/actions/team"

export function SecuritySettingsCard() {
  const { settings, loading, error, refetch } = useSettings()
  const [resettingPassword, setResettingPassword] = useState(false)

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

  async function handleResetPassword() {
    setResettingPassword(true)
    try {
      const result = await resetPasswordAction()
      toast.success(result.message ?? "Ссылка для сброса пароля отправлена")
    } catch (err: any) {
      toast.error(err?.message ?? "Ошибка отправки ссылки для сброса пароля")
    } finally {
      setResettingPassword(false)
    }
  }

  function handleSetup2FA() {
    // TODO: Реализовать интеграцию с 2FA (сложная интеграция)
    toast.info("Настройка двухфакторной аутентификации будет доступна в ближайшее время")
  }

  function handleManageSessions() {
    // TODO: Реализовать управление сессиями через Supabase Auth
    toast.info("Управление сессиями будет доступно в ближайшее время")
  }

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
        <CardContent>
          <Button variant="outline" onClick={refetch}>
            Повторить
          </Button>
        </CardContent>
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
            onClick={handleResetPassword}
            disabled={resettingPassword}
            className="gap-1.5"
          >
            {resettingPassword ? <Spinner className="size-3.5 animate-spin" /> : null}
            {resettingPassword ? "Отправка..." : "Сменить пароль"}
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
              onClick={handleSetup2FA}
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
              onClick={handleManageSessions}
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
