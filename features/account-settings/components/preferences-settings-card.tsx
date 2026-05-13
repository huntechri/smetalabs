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
import type { AccountPreferences } from "../types"

type SettingsStateProps = {
  preferences: Partial<AccountPreferences> | null | undefined
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
  options,
}: {
  id: string
  label: string
  value: string
  options: readonly (readonly [string, string])[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      <Select value={value} disabled>
        <SelectTrigger id={id} className="w-full opacity-70">
          <SelectValue />
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

export function PreferencesSettingsCard({ preferences }: SettingsStateProps) {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Настройки интерфейса</CardTitle>
            <CardDescription>
              Персонализация внешнего вида и форматов отображения находится в разработке.
            </CardDescription>
          </div>
          <span className="w-fit rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
            Скоро
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Эти параметры пока не влияют на интерфейс приложения. Мы оставили блок
          видимым, чтобы обозначить запланированную персонализацию, но отключили
          сохранение до полноценной реализации.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="theme"
            label="Тема"
            value={preferences?.theme ?? "system"}
            options={fields.theme}
          />
          <SelectField
            id="density"
            label="Плотность интерфейса"
            value={preferences?.density ?? "comfortable"}
            options={fields.density}
          />
          <SelectField
            id="dateFormat"
            label="Формат даты"
            value={preferences?.dateFormat ?? "ДД.ММ.ГГГГ"}
            options={fields.dateFormat}
          />
          <SelectField
            id="numberFormat"
            label="Формат чисел"
            value={preferences?.numberFormat ?? "1 000,00"}
            options={fields.numberFormat}
          />
          <SelectField
            id="defaultEstimateView"
            label="Вид смет по умолчанию"
            value={preferences?.defaultEstimateView ?? "table"}
            options={fields.defaultEstimateView}
          />
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button disabled>Функция в разработке</Button>
      </CardFooter>
    </Card>
  )
}
