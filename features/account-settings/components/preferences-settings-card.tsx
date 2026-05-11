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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { mockPreferences } from "../__mocks__/account-settings"

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
  const prefs = mockPreferences

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
            <Select defaultValue={prefs.theme}>
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
            <Select defaultValue={prefs.density}>
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
            <Select defaultValue={prefs.dateFormat}>
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
            <Select defaultValue={prefs.numberFormat}>
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
            <Select defaultValue={prefs.defaultEstimateView}>
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
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button
          onClick={() => console.log("Save preferences settings")}
        >
          Сохранить
        </Button>
      </CardFooter>
    </Card>
  )
}
