"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useSettings, useUpdatePreferences } from "../hooks/use-account-settings"

const themes = [
  { value: "system", label: "Системная" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
]

const densities = [
  { value: "comfortable", label: "Комфортная" },
  { value: "compact", label: "Компактная" },
]

const dateFormats = [
  { value: "ДД.ММ.ГГГГ", label: "ДД.ММ.ГГГГ" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
]

const numberFormats = [
  { value: "1 000,00", label: "1 000,00" },
  { value: "1,000.00", label: "1,000.00" },
  { value: "1 000.00", label: "1 000.00" },
]

const estimateViews = [
  { value: "table", label: "Таблица" },
  { value: "kanban", label: "Канбан" },
  { value: "list", label: "Список" },
]

export function PreferencesSettingsCard() {
  const { settings, loading, error, refetch } = useSettings()
  const { updatePreferences, loading: saving, error: saveError } =
    useUpdatePreferences()

  const [theme, setTheme] = useState("system")
  const [density, setDensity] = useState("comfortable")
  const [dateFormat, setDateFormat] = useState("ДД.ММ.ГГГГ")
  const [numberFormat, setNumberFormat] = useState("1 000,00")
  const [defaultEstimateView, setDefaultEstimateView] = useState("table")

  useEffect(() => {
    if (settings?.preferences) {
      const p = settings.preferences
      setTheme(p.theme ?? "system")
      setDensity(p.density ?? "comfortable")
      setDateFormat(p.dateFormat ?? "ДД.ММ.ГГГГ")
      setNumberFormat(p.numberFormat ?? "1 000,00")
      setDefaultEstimateView(p.defaultEstimateView ?? "table")
    }
  }, [settings])

  const handleSave = async () => {
    await updatePreferences({
      theme: theme as "system" | "light" | "dark",
      density: density as "comfortable" | "compact",
      dateFormat,
      numberFormat,
      defaultEstimateView,
    })
  }

  // ── Loading state ──
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 5 }).map((_, i) => (
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
  if (error && !settings?.preferences) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Настройки интерфейса</CardTitle>
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
        <CardTitle>Настройки интерфейса</CardTitle>
        <CardDescription>
          Персонализация внешнего вида и форматов отображения
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="theme">Тема</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme" className="w-full">
                <SelectValue placeholder="Выберите тему" />
              </SelectTrigger>
              <SelectContent>
                {themes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="density">Плотность интерфейса</Label>
            <Select value={density} onValueChange={setDensity}>
              <SelectTrigger id="density" className="w-full">
                <SelectValue placeholder="Выберите плотность" />
              </SelectTrigger>
              <SelectContent>
                {densities.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dateFormat">Формат даты</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger id="dateFormat" className="w-full">
                <SelectValue placeholder="Выберите формат" />
              </SelectTrigger>
              <SelectContent>
                {dateFormats.map((df) => (
                  <SelectItem key={df.value} value={df.value}>
                    {df.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="numberFormat">Формат чисел</Label>
            <Select value={numberFormat} onValueChange={setNumberFormat}>
              <SelectTrigger id="numberFormat" className="w-full">
                <SelectValue placeholder="Выберите формат" />
              </SelectTrigger>
              <SelectContent>
                {numberFormats.map((nf) => (
                  <SelectItem key={nf.value} value={nf.value}>
                    {nf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultEstimateView">Вид смет по умолчанию</Label>
            <Select
              value={defaultEstimateView}
              onValueChange={setDefaultEstimateView}
            >
              <SelectTrigger id="defaultEstimateView" className="w-full">
                <SelectValue placeholder="Выберите вид" />
              </SelectTrigger>
              <SelectContent>
                {estimateViews.map((ev) => (
                  <SelectItem key={ev.value} value={ev.value}>
                    {ev.label}
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
