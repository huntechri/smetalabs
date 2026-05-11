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
import { mockWorkspace } from "../__mocks__/account-settings"

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
  { value: "Europe/Moscow", label: "UTC+3 Москва" },
  { value: "Europe/Kaliningrad", label: "UTC+2 Калининград" },
  { value: "Europe/Samara", label: "UTC+4 Самара" },
  { value: "Asia/Yekaterinburg", label: "UTC+5 Екатеринбург" },
  { value: "Asia/Omsk", label: "UTC+6 Омск" },
  { value: "Asia/Novosibirsk", label: "UTC+7 Новосибирск" },
  { value: "Asia/Irkutsk", label: "UTC+8 Иркутск" },
  { value: "Asia/Vladivostok", label: "UTC+10 Владивосток" },
]

export function WorkspaceSettingsCard() {
  const workspace = mockWorkspace

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
              defaultValue={workspace.workspaceName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyLegalName">
              Юридическое название компании
            </Label>
            <Input
              id="companyLegalName"
              defaultValue={workspace.companyLegalName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyType">Тип компании</Label>
            <Select defaultValue={workspace.companyType}>
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
            <Label htmlFor="registrationNumber">
              Регистрационный номер
            </Label>
            <Input
              id="registrationNumber"
              defaultValue={workspace.registrationNumber}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxNumber">ИНН / Налоговый номер</Label>
            <Input id="taxNumber" defaultValue={workspace.taxNumber} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billingEmail">Email для счетов</Label>
            <Input
              id="billingEmail"
              type="email"
              defaultValue={workspace.billingEmail}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyPhone">Телефон компании</Label>
            <Input
              id="companyPhone"
              type="tel"
              defaultValue={workspace.companyPhone}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultCurrency">Валюта по умолчанию</Label>
            <Select defaultValue={workspace.defaultCurrency}>
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
            <Select defaultValue={workspace.defaultLocale}>
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
            <Select defaultValue={workspace.defaultTimezone}>
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
            defaultValue={workspace.legalAddress}
            rows={2}
          />
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button
          onClick={() => console.log("Save workspace settings")}
        >
          Сохранить
        </Button>
      </CardFooter>
    </Card>
  )
}
