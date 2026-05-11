"use client"

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
import { mockNotifications } from "../__mocks__/account-settings"

const notificationLabels: Record<string, string> = {
  projectUpdates: "Обновления проектов",
  estimateUpdates: "Обновления смет",
  procurementUpdates: "Обновления закупок",
  teamInvitations: "Приглашения в команду",
  billingNotifications: "Уведомления о счетах",
  weeklySummary: "Еженедельная сводка",
}

export function NotificationSettingsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Уведомления</CardTitle>
        <CardDescription>
          Настройте, какие уведомления вы хотите получать
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {Object.entries(notificationLabels).map(([key, label]) => (
          <div
            key={key}
            className="flex items-center justify-between py-1.5"
          >
            <Label
              htmlFor={`notif-${key}`}
              className="cursor-pointer font-normal"
            >
              {label}
            </Label>
            <Switch
              id={`notif-${key}`}
              defaultChecked={
                mockNotifications[key as keyof typeof mockNotifications]
              }
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button
          onClick={() => console.log("Save notification settings")}
        >
          Сохранить
        </Button>
      </CardFooter>
    </Card>
  )
}
