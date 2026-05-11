"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { mockProfile } from "../__mocks__/account-settings"

const languages = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
]

const timezones = [
  { value: "Europe/Moscow", label: "UTC+3 Москва" },
  { value: "Europe/Kaliningrad", label: "UTC+2 Калининград" },
  { value: "Europe/Samara", label: "UTC+4 Самара" },
  { value: "Asia/Yekaterinburg", label: "UTC+5 Екатеринбург" },
  { value: "Asia/Omsk", label: "UTC+6 Омск" },
  { value: "Asia/Novosibirsk", label: "UTC+7 Новосибирск" },
  { value: "Asia/Irkutsk", label: "UTC+8 Иркутск" },
  { value: "Asia/Vladivostok", label: "UTC+10 Владивосток" },
  { value: "Europe/London", label: "UTC+0 Лондон" },
  { value: "America/New_York", label: "UTC-5 Нью-Йорк" },
]

export function ProfileSettingsCard() {
  const profile = mockProfile

  return (
    <Card>
      <CardHeader>
        <CardTitle>Личный профиль</CardTitle>
        <CardDescription>
          Ваши личные данные и контактная информация
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>
              {profile.displayName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{profile.displayName}</span>
            <span className="text-xs text-muted-foreground">{profile.email}</span>
          </div>
        </div>
        <Separator />
        <div className="grid gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">Отображаемое имя</Label>
            <Input id="displayName" defaultValue={profile.displayName} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue={profile.email}
              readOnly
              className="bg-muted/50 cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Телефон</Label>
            <Input id="phone" type="tel" defaultValue={profile.phone} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jobTitle">Должность</Label>
            <Input id="jobTitle" defaultValue={profile.jobTitle} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="language">Язык</Label>
            <Select defaultValue={profile.language}>
              <SelectTrigger id="language" className="w-full">
                <SelectValue placeholder="Выберите язык" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timezone">Часовой пояс</Label>
            <Select defaultValue={profile.timezone}>
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder="Выберите часовой пояс" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button
          onClick={() => console.log("Save profile settings")}
        >
          Сохранить
        </Button>
      </CardFooter>
    </Card>
  )
}
