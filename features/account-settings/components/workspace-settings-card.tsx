/* eslint-disable react-hooks/set-state-in-effect */
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useUpdateWorkspace } from "../hooks/use-account-settings"
import type { WorkspaceAccessInfo, WorkspaceSettings } from "../types"

const companyTypes = [
  { value: "ООО", label: "ООО" },
  { value: "АО", label: "АО" },
  { value: "ИП", label: "ИП" },
  { value: "ПАО", label: "ПАО" },
  { value: "ЗАО", label: "ЗАО" },
]

const currencies = [
  { value: "RUB", label: "RUB — Российский рубль" },
  { value: "USD", label: "USD — Доллар США" },
  { value: "EUR", label: "EUR — Евро" },
]

const locales = [
  { value: "ru-RU", label: "ru-RU" },
  { value: "en-US", label: "en-US" },
]

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/Moscow", label: "UTC+3 Москва" },
  { value: "Europe/Kaliningrad", label: "UTC+2 Калининград" },
  { value: "Europe/Samara", label: "UTC+4 Самара" },
  { value: "Asia/Yekaterinburg", label: "UTC+5 Екатеринбург" },
  { value: "Asia/Omsk", label: "UTC+6 Омск" },
  { value: "Asia/Novosibirsk", label: "UTC+7 Новосибирск" },
  { value: "Asia/Irkutsk", label: "UTC+8 Иркутск" },
  { value: "Asia/Vladivostok", label: "UTC+10 Владивосток" },
]

type SettingsStateProps = {
  workspace: Partial<WorkspaceSettings> | null | undefined
  workspaceAccess: WorkspaceAccessInfo | null | undefined
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function ReadonlyField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="min-h-8 rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
        {value?.trim() || "—"}
      </div>
    </div>
  )
}

export function WorkspaceSettingsCard({
  workspace,
  workspaceAccess,
  loading,
  error,
  refetch,
}: SettingsStateProps) {
  const {
    updateWorkspace,
    loading: saving,
    error: saveError,
  } = useUpdateWorkspace()

  const canEditWorkspace = workspaceAccess?.canEditWorkspace === true

  const [workspaceName, setWorkspaceName] = useState("")
  const [companyLegalName, setCompanyLegalName] = useState("")
  const [companyType, setCompanyType] = useState("ООО")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [taxNumber, setTaxNumber] = useState("")
  const [legalAddress, setLegalAddress] = useState("")
  const [billingEmail, setBillingEmail] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [defaultCurrency, setDefaultCurrency] = useState("RUB")
  const [defaultLocale, setDefaultLocale] = useState("ru-RU")
  const [defaultTimezone, setDefaultTimezone] = useState("UTC")

  useEffect(() => {
    if (workspace) {
      const w = workspace
      setWorkspaceName(w.workspaceName ?? "")
      setCompanyLegalName(w.companyLegalName ?? "")
      setCompanyType(w.companyType ?? "ООО")
      setRegistrationNumber(w.registrationNumber ?? "")
      setTaxNumber(w.taxNumber ?? "")
      setLegalAddress(w.legalAddress ?? "")
      setBillingEmail(w.billingEmail ?? "")
      setCompanyPhone(w.companyPhone ?? "")
      setDefaultCurrency(w.defaultCurrency ?? "RUB")
      setDefaultLocale(w.defaultLocale ?? "ru-RU")
      setDefaultTimezone(w.defaultTimezone ?? "UTC")
    }
  }, [workspace])

  const handleSave = async () => {
    if (!canEditWorkspace) return

    const updated = await updateWorkspace({
      workspaceName,
      companyLegalName,
      companyType,
      registrationNumber,
      taxNumber,
      legalAddress,
      billingEmail,
      companyPhone,
      defaultCurrency,
      defaultLocale,
      defaultTimezone,
    })
    if (updated) await refetch()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-3.5 w-72" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !workspace) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Рабочее пространство</CardTitle>
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

  if (!canEditWorkspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Рабочее пространство</CardTitle>
          <CardDescription>
            Данные workspace, к которому у вас есть доступ. Изменять эти данные может только владелец workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadonlyField label="Название workspace" value={workspaceName} />
            <ReadonlyField
              label="Юридическое название компании"
              value={companyLegalName}
            />
            <ReadonlyField label="Тип компании" value={companyType} />
            <ReadonlyField
              label="Регистрационный номер"
              value={registrationNumber}
            />
            <ReadonlyField label="ИНН / Налоговый номер" value={taxNumber} />
            <ReadonlyField label="Email для счетов" value={billingEmail} />
            <ReadonlyField label="Телефон компании" value={companyPhone} />
            <ReadonlyField
              label="Валюта по умолчанию"
              value={defaultCurrency}
            />
            <ReadonlyField label="Локаль по умолчанию" value={defaultLocale} />
            <ReadonlyField
              label="Часовой пояс по умолчанию"
              value={defaultTimezone}
            />
          </div>
          <ReadonlyField label="Юридический адрес" value={legalAddress} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Рабочее пространство</CardTitle>
        <CardDescription>
          Данные компании и настройки рабочего пространства
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspaceName">Название workspace</Label>
            <Input
              id="workspaceName"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyLegalName">
              Юридическое название компании
            </Label>
            <Input
              id="companyLegalName"
              value={companyLegalName}
              onChange={(e) => setCompanyLegalName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyType">Тип компании</Label>
            <Select value={companyType} onValueChange={setCompanyType}>
              <SelectTrigger id="companyType" className="w-full">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {companyTypes.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="registrationNumber">Регистрационный номер</Label>
            <Input
              id="registrationNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxNumber">ИНН / Налоговый номер</Label>
            <Input
              id="taxNumber"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billingEmail">Email для счетов</Label>
            <Input
              id="billingEmail"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyPhone">Телефон компании</Label>
            <Input
              id="companyPhone"
              type="tel"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultCurrency">Валюта по умолчанию</Label>
            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
              <SelectTrigger id="defaultCurrency" className="w-full">
                <SelectValue placeholder="Выберите валюту" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultLocale">Локаль по умолчанию</Label>
            <Select value={defaultLocale} onValueChange={setDefaultLocale}>
              <SelectTrigger id="defaultLocale" className="w-full">
                <SelectValue placeholder="Выберите локаль" />
              </SelectTrigger>
              <SelectContent>
                {locales.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultTimezone">Часовой пояс по умолчанию</Label>
            <Select value={defaultTimezone} onValueChange={setDefaultTimezone}>
              <SelectTrigger id="defaultTimezone" className="w-full">
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="legalAddress">Юридический адрес</Label>
          <Textarea
            id="legalAddress"
            value={legalAddress}
            onChange={(e) => setLegalAddress(e.target.value)}
            rows={2}
          />
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
