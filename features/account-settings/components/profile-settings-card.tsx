/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useSettings, useUpdateProfile } from "../hooks/use-account-settings"

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
  const { settings, loading, error, refetch } = useSettings()
  const {
    updateProfile,
    loading: saving,
    error: saveError,
  } = useUpdateProfile()

  const [displayName, setDisplayName] = useState("")
  const [phone, setPhone] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [language, setLanguage] = useState("ru")
  const [timezone, setTimezone] = useState("Europe/Moscow")

  // Sync settings into local state when loaded
  useEffect(() => {
    if (settings?.profile) {
      const p = settings.profile
      setDisplayName(p.displayName ?? "")
      setPhone(p.phone ?? "")
      setJobTitle(p.jobTitle ?? "")
      setLanguage(p.language ?? "ru")
      setTimezone(p.timezone ?? "Europe/Moscow")
    }
  }, [settings])

  const profile = settings?.profile

  const handleSave = async () => {
    const updated = await updateProfile({
      displayName,
      phone,
      jobTitle,
      language,
      timezone,
    })
    if (updated) await refetch()
  }

  // ── Loading state ──
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Separator />
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Error state ──
  if (error && !profile) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Личный профиль</CardTitle>
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

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "?"

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
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {profile?.displayName ?? "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {profile?.email ?? "—"}
            </span>
          </div>
        </div>
        <Separator />
        <div className="grid gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">Отображаемое имя</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile?.email ?? ""}
              readOnly
              className="cursor-not-allowed bg-muted/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jobTitle">Должность</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="language">Язык</Label>
            <Select value={language} onValueChange={setLanguage}>
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
            <Select value={timezone} onValueChange={setTimezone}>
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
