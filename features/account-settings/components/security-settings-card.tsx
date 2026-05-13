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

import {
  revokeOtherSessionsAction,
  sendOwnPasswordResetEmailAction,
} from "@/app/actions/settings"
import type { SecurityInfo } from "../types"

type SettingsStateProps = {
  security: Partial<SecurityInfo> | null | undefined
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function SecuritySettingsCard({
  security,
  loading,
  error,
  refetch,
}: SettingsStateProps) {
  const [resettingPassword, setResettingPassword] = useState(false)
  const [revokingSessions, setRevokingSessions] = useState(false)

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
      const result = await sendOwnPasswordResetEmailAction()
      toast.success(result.message ?? "Ссылка для сброса пароля отправлена")
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Ошибка отправки ссылки для сброса пароля"
      )
    } finally {
      setResettingPassword(false)
    }
  }

  async function handleRevokeOtherSessions() {
    setRevokingSessions(true)
    try {
      const result = await revokeOtherSessionsAction()
      toast.success(result.message ?? "Другие сессии завершены")
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Ошибка завершения других сессий"
      )
    } finally {
      setRevokingSessions(false)
    }
  }

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
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Пароль</span>
            <span className="text-xs text-muted-foreground">
              Мы отправим ссылку для смены пароля на ваш email
            </span>
          </div>
          <Button
            variant="outline"
            onClick={handleResetPassword}
            disabled={resettingPassword}
            className="gap-1.5"
          >
            {resettingPassword ? (
              <Spinner className="size-3.5 animate-spin" />
            ) : null}
            {resettingPassword ? "Отправка..." : "Сменить пароль"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Двухфакторная аутентификация</span>
            <span className="text-xs text-muted-foreground">
              Дополнительная защита аккаунта будет подключена отдельной задачей
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Скоро</Badge>
            <Button
              variant="outline"
              disabled
              title="Настройка 2FA будет подключена отдельной задачей"
            >
              Настроить · скоро
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Другие сессии</span>
            <span className="text-xs text-muted-foreground">
              Завершите вход на других устройствах, не выходя из текущей сессии
            </span>
          </div>
          <Button
            variant="outline"
            onClick={handleRevokeOtherSessions}
            disabled={revokingSessions}
            className="gap-1.5"
          >
            {revokingSessions ? (
              <Spinner className="size-3.5 animate-spin" />
            ) : null}
            {revokingSessions ? "Завершение..." : "Завершить другие"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Последний вход</span>
            <span className="text-xs text-muted-foreground">
              Дата и время последней авторизации по данным Supabase Auth
            </span>
          </div>
          <span className="text-xs">{formattedLastLogin}</span>
        </div>
      </CardContent>
    </Card>
  )
}
