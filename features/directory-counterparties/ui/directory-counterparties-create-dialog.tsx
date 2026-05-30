"use client"

import { type FormEvent, useEffect, useState } from "react"
import type {
  CounterpartyType,
  DirectoryCounterparty,
  DirectoryCounterpartyMutationInput,
  LegalStatus,
} from "../model/directory-counterparties-model"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type FormState = {
  name: string
  type: CounterpartyType | ""
  legalStatus: LegalStatus | ""
  inn: string
  phone: string
  legalAddress: string
  bankName: string
  bik: string
  corrAccount: string
  accountNumber: string
  passportSeries: string
  passportNumber: string
  passportIssuedBy: string
  passportIssueDate: string
  passportDepartmentCode: string
  registrationAddress: string
}

const emptyState: FormState = {
  name: "",
  type: "",
  legalStatus: "",
  inn: "",
  phone: "",
  legalAddress: "",
  bankName: "",
  bik: "",
  corrAccount: "",
  accountNumber: "",
  passportSeries: "",
  passportNumber: "",
  passportIssuedBy: "",
  passportIssueDate: "",
  passportDepartmentCode: "",
  registrationAddress: "",
}

function initialState(counterparty: DirectoryCounterparty | null): FormState {
  if (!counterparty) return emptyState

  return {
    name: counterparty.name,
    type: counterparty.type,
    legalStatus: counterparty.legalStatus,
    inn: counterparty.inn ?? "",
    phone: counterparty.phone ?? "",
    legalAddress: counterparty.legalAddress ?? "",
    bankName: counterparty.bankDetails.bankName ?? "",
    bik: counterparty.bankDetails.bik ?? "",
    corrAccount: counterparty.bankDetails.corrAccount ?? "",
    accountNumber: counterparty.bankDetails.accountNumber ?? "",
    passportSeries: counterparty.passport.series ?? "",
    passportNumber: counterparty.passport.number ?? "",
    passportIssuedBy: counterparty.passport.issuedBy ?? "",
    passportIssueDate: counterparty.passport.issueDate ?? "",
    passportDepartmentCode: counterparty.passport.departmentCode ?? "",
    registrationAddress: counterparty.passport.registrationAddress ?? "",
  }
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Не удалось сохранить контрагента"
}

export function DirectoryCounterpartiesCreateDialog({
  counterparty = null,
  open,
  onOpenChange,
  onSubmit,
  saving,
}: {
  counterparty?: DirectoryCounterparty | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: DirectoryCounterpartyMutationInput) => Promise<void>
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(() => initialState(counterparty))
  const [error, setError] = useState<string | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return
    setForm(initialState(counterparty))
    setError(null)
  }, [counterparty, open])
  /* eslint-enable react-hooks/set-state-in-effect */

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = form.name.trim()
    if (!name) {
      setError("Заполните название или ФИО")
      return
    }
    if (!form.type) {
      setError("Выберите тип контрагента")
      return
    }
    if (!form.legalStatus) {
      setError("Выберите статус лица")
      return
    }

    const isJuridical = form.legalStatus === "juridical"
    const input: DirectoryCounterpartyMutationInput = {
      name,
      type: form.type,
      legalStatus: form.legalStatus,
      inn: nullable(form.inn),
      phone: nullable(form.phone),
      legalAddress: isJuridical ? nullable(form.legalAddress) : null,
      bankName: isJuridical ? nullable(form.bankName) : null,
      bik: isJuridical ? nullable(form.bik) : null,
      corrAccount: isJuridical ? nullable(form.corrAccount) : null,
      accountNumber: isJuridical ? nullable(form.accountNumber) : null,
      passportSeries: isJuridical ? null : nullable(form.passportSeries),
      passportNumber: isJuridical ? null : nullable(form.passportNumber),
      passportIssuedBy: isJuridical ? null : nullable(form.passportIssuedBy),
      passportIssueDate: isJuridical ? null : nullable(form.passportIssueDate),
      passportDepartmentCode: isJuridical
        ? null
        : nullable(form.passportDepartmentCode),
      registrationAddress: isJuridical
        ? null
        : nullable(form.registrationAddress),
    }

    try {
      setError(null)
      await onSubmit(input)
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {counterparty ? "Редактировать контрагента" : "Новый контрагент"}
          </DialogTitle>
          <DialogDescription>
            Заполните обязательные поля. Остальные данные можно добавить позже.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="counterparty-name">
                Название или ФИО
              </FieldLabel>
              <Input
                id="counterparty-name"
                maxLength={240}
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="counterparty-type">Тип</FieldLabel>
              <Select
                value={form.type}
                onValueChange={(value) => setField("type", value)}
              >
                <SelectTrigger id="counterparty-type" className="w-full">
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Заказчик</SelectItem>
                  <SelectItem value="contractor">Подрядчик</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="counterparty-status">Статус лица</FieldLabel>
              <Select
                value={form.legalStatus}
                onValueChange={(value) => setField("legalStatus", value)}
              >
                <SelectTrigger id="counterparty-status" className="w-full">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="juridical">Юр. лицо</SelectItem>
                  <SelectItem value="individual">Физ. лицо</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="counterparty-inn">ИНН</FieldLabel>
              <Input
                id="counterparty-inn"
                maxLength={20}
                value={form.inn}
                onChange={(event) => setField("inn", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="counterparty-phone">Телефон</FieldLabel>
              <Input
                id="counterparty-phone"
                maxLength={40}
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
              />
            </Field>
          </FieldGroup>

          {form.legalStatus === "juridical" ? (
            <FieldGroup className="grid gap-3 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="counterparty-address">
                  Юридический адрес
                </FieldLabel>
                <Input
                  id="counterparty-address"
                  maxLength={500}
                  value={form.legalAddress}
                  onChange={(event) =>
                    setField("legalAddress", event.target.value)
                  }
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="counterparty-bank">Банк</FieldLabel>
                <Input
                  id="counterparty-bank"
                  maxLength={240}
                  value={form.bankName}
                  onChange={(event) => setField("bankName", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="counterparty-bik">БИК</FieldLabel>
                <Input
                  id="counterparty-bik"
                  maxLength={20}
                  value={form.bik}
                  onChange={(event) => setField("bik", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="counterparty-corr">Корр. счёт</FieldLabel>
                <Input
                  id="counterparty-corr"
                  maxLength={40}
                  value={form.corrAccount}
                  onChange={(event) =>
                    setField("corrAccount", event.target.value)
                  }
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="counterparty-account">
                  Расчётный счёт
                </FieldLabel>
                <Input
                  id="counterparty-account"
                  maxLength={40}
                  value={form.accountNumber}
                  onChange={(event) =>
                    setField("accountNumber", event.target.value)
                  }
                />
              </Field>
            </FieldGroup>
          ) : null}

          {form.legalStatus === "individual" ? (
            <FieldGroup className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="counterparty-passport-series">
                  Серия паспорта
                </FieldLabel>
                <Input
                  id="counterparty-passport-series"
                  maxLength={20}
                  value={form.passportSeries}
                  onChange={(event) =>
                    setField("passportSeries", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="counterparty-passport-number">
                  Номер паспорта
                </FieldLabel>
                <Input
                  id="counterparty-passport-number"
                  maxLength={20}
                  value={form.passportNumber}
                  onChange={(event) =>
                    setField("passportNumber", event.target.value)
                  }
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="counterparty-issued-by">
                  Кем выдан
                </FieldLabel>
                <Input
                  id="counterparty-issued-by"
                  maxLength={500}
                  value={form.passportIssuedBy}
                  onChange={(event) =>
                    setField("passportIssuedBy", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="counterparty-issue-date">
                  Дата выдачи
                </FieldLabel>
                <Input
                  id="counterparty-issue-date"
                  maxLength={20}
                  value={form.passportIssueDate}
                  onChange={(event) =>
                    setField("passportIssueDate", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="counterparty-department">
                  Код подразделения
                </FieldLabel>
                <Input
                  id="counterparty-department"
                  maxLength={20}
                  value={form.passportDepartmentCode}
                  onChange={(event) =>
                    setField("passportDepartmentCode", event.target.value)
                  }
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="counterparty-registration">
                  Адрес регистрации
                </FieldLabel>
                <Input
                  id="counterparty-registration"
                  maxLength={500}
                  value={form.registrationAddress}
                  onChange={(event) =>
                    setField("registrationAddress", event.target.value)
                  }
                />
              </Field>
            </FieldGroup>
          ) : null}

          <FieldError>{error}</FieldError>

          <DialogFooter showCloseButton={false}>
            <Button
              disabled={saving}
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button disabled={saving} type="submit">
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
