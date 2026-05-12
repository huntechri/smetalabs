/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useUpdatePreferences } from "../hooks/use-account-settings"
import type { SettingsResponse } from "../hooks/use-account-settings"

type SettingsStateProps = {
  settings: SettingsResponse["data"] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const fields = {
  theme: [
    ["system", "Системная"],
    ["light", "Светлая"],
    ["dark", "Тёмная"],
  ],
  density: [
    ["comfortable", "Комфортная"],
    ["compact", "Компактная"],
  ],
  dateFormat: [
    ["ДД.ММ.ГГГГ", "ДД.ММ.ГГГГ"],
    ["MM/DD/YYYY", "MM/DD/YYYY"],
    ["YYYY-MM-DD", "YYYY-MM-DD"],
  ],
  numberFormat: [
    ["1 000,00", "1 000,00"],
    ["1,000.00", "1,000.00"],
    ["1 000.00", "1 000.00"],
  ],
  defaultEstimateView: [
    ["table", "Таблица"],
    ["kanban", "Канбан"],
    ["list", "Список"],
  ],
} as const

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly (readonly [string, string])[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Выберите значение" />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function PreferencesSettingsCard({ settings, loading, error, refetch }: SettingsStateProps) {
  const { updatePreferences, loading: saving, error: saveError } = useUpdatePreferences()
  const [theme, setTheme] = useState("system")
  const [density, setDensity] = useState("comfortable")
  const [dateFormat, setDateFormat] = useState("ДД.ММ.ГГГГ")
  const [numberFormat, setNumberFormat] = useState("1 000,00")
  const [defaultEstimateView, setDefaultEstimateView] = useState("table")

  useEffect(() => {
    const p = settings?.preferences
    if (!p) return
    setTheme(p.theme ?? "system")
    setDensity(p.density ?? "comfortable")
    setDateFormat(p.dateFormat ?? "ДД.ММ.ГГГГ")
    setNumberFormat(p.numberFormat ?? "1 000,00")
    setDefaultEstimateView(p.defaultEstimateView ?? "table")
  }, [settings])

  async function handleSave() {
    const updated = await updatePreferences({
      theme: theme as "system" | "light" | "dark",
      density: density as "comfortable" | "compact",
      dateFormat,
      numberFormat,
      defaultEstimateView,
    })
    if (updated) await refetch()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error && !settings?.preferences) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Настройки интерфейса</CardTitle>
          <CardDescription className="text-destructive">Ошибка загрузки: {error}</CardDescription>
        </CardHeader>
        <CardFooter><Button variant="outline" onClick={refetch}>Повторить</Button></CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Настройки интерфейса</CardTitle>
        <CardDescription>Персонализация внешнего вида и форматов отображения</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="theme" label="Тема" value={theme} onChange={setTheme} options={fields.theme} />
          <SelectField id="density" label="Плотность интерфейса" value={density} onChange={setDensity} options={fields.density} />
          <SelectField id="dateFormat" label="Формат даты" value={dateFormat} onChange={setDateFormat} options={fields.dateFormat} />
          <SelectField id="numberFormat" label="Формат чисел" value={numberFormat} onChange={setNumberFormat} options={fields.numberFormat} />
          <SelectField id="defaultEstimateView" label="Вид смет по умолчанию" value={defaultEstimateView} onChange={setDefaultEstimateView} options={fields.defaultEstimateView} />
        </div>
        {saveError && <p className="text-xs text-destructive">Ошибка сохранения: {saveError}</p>}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
      </CardFooter>
    </Card>
  )
}
