/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useUpdateNotifications } from "../application/use-account-settings"
import type { NotificationSettings } from "../types"

type SettingsStateProps = {
  notifications: Partial<NotificationSettings> | null | undefined
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const notificationLabels: Record<keyof NotificationSettings, string> = {
  projectUpdates: "Обновления проектов",
  estimateUpdates: "Обновления смет",
  procurementUpdates: "Обновления закупок",
  teamInvitations: "Приглашения в команду",
  billingNotifications: "Уведомления о счетах",
  weeklySummary: "Еженедельная сводка",
}

const notifKeys = Object.keys(
  notificationLabels
) as (keyof NotificationSettings)[]

const defaultNotifs: NotificationSettings = {
  projectUpdates: false,
  estimateUpdates: false,
  procurementUpdates: false,
  teamInvitations: false,
  billingNotifications: false,
  weeklySummary: false,
}

export function NotificationSettingsCard({
  notifications,
  loading,
  error,
  refetch,
}: SettingsStateProps) {
  const {
    updateNotifications,
    loading: saving,
    error: saveError,
  } = useUpdateNotifications()
  const [notifs, setNotifs] = useState<NotificationSettings>(defaultNotifs)

  useEffect(() => {
    if (notifications) {
      setNotifs({ ...defaultNotifs, ...notifications })
    }
  }, [notifications])

  function handleToggle(key: keyof NotificationSettings, checked: boolean) {
    setNotifs((prev) => ({ ...prev, [key]: checked }))
  }

  async function handleSave() {
    const updated = await updateNotifications(notifs)
    if (updated) await refetch()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3.5 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error && !notifications) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Уведомления</CardTitle>
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
        <CardTitle>Уведомления</CardTitle>
        <CardDescription>
          Настройте, какие уведомления вы хотите получать
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {notifKeys.map((key) => (
          <div key={key} className="flex items-center justify-between py-1.5">
            <Label
              htmlFor={`notif-${key}`}
              className="cursor-pointer font-normal"
            >
              {notificationLabels[key]}
            </Label>
            <Switch
              id={`notif-${key}`}
              checked={notifs[key]}
              onCheckedChange={(checked) => handleToggle(key, checked)}
            />
          </div>
        ))}
        {saveError && (
          <p className="text-xs text-destructive">
            Ошибка сохранения: {saveError}
          </p>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
      </CardFooter>
    </Card>
  )
}
