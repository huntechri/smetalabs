import { useState, useEffect, type FormEvent } from "react"
import type {
  CounterpartyType,
  DirectoryCounterparty,
  DirectoryCounterpartyMutationInput,
  LegalStatus,
} from "@/features/directory-counterparties/types"

export type FormState = {
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

export function useCounterpartyForm({
  counterparty,
  open,
  onOpenChange,
  onSubmit,
}: {
  counterparty?: DirectoryCounterparty | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: DirectoryCounterpartyMutationInput) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(() =>
    initialState(counterparty ?? null)
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(initialState(counterparty ?? null))
      setError(null)
    }
  }, [open, counterparty])

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!form.name.trim()) {
      setError("Укажите название или ФИО контрагента")
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
      name: form.name.trim(),
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

  return {
    form,
    error,
    setField,
    handleSubmit,
  }
}
