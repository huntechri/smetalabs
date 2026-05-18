"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchDirectoryCounterparties } from "@/features/directory-counterparties/api/directory-counterparties-client"
import { directoryCounterpartiesQueryKeys } from "@/features/directory-counterparties/api/directory-counterparties-query-keys"
import type { ProjectMutationInput, ProjectRow, ProjectStatus } from "@/types/project"

const STATUS_OPTIONS: { label: string; value: ProjectStatus }[] = [
  { label: "Новый", value: "new" },
  { label: "В работе", value: "in_progress" },
  { label: "Завершён", value: "completed" },
]

const NO_CUSTOMER_VALUE = "__no_customer__"
const CUSTOMER_LIST_PARAMS = {
  status: "active" as const,
  limit: 100,
  cursor: 0,
  sort: "name_asc" as const,
}

type FormState = {
  title: string
  customerCounterpartyId: string
  address: string
  startDate: string
  endDate: string
  status: ProjectStatus
}

const EMPTY_FORM: FormState = {
  title: "",
  customerCounterpartyId: "",
  address: "",
  startDate: "",
  endDate: "",
  status: "new",
}

function initialState(project?: ProjectRow | null): FormState {
  if (!project) return EMPTY_FORM

  return {
    title: project.title,
    customerCounterpartyId: project.customerCounterpartyId ?? "",
    address: project.address ?? "",
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
    status: project.status,
  }
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось сохранить проект"
}

function toMutationInput(form: FormState): ProjectMutationInput {
  return {
    title: form.title.trim(),
    customerCounterpartyId: nullable(form.customerCounterpartyId),
    address: nullable(form.address),
    startDate: nullable(form.startDate),
    endDate: nullable(form.endDate),
    status: form.status,
  }
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  project,
  saving,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectRow | null
  saving?: boolean
  onSubmit: (input: ProjectMutationInput) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(() => initialState(project))
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(project)

  const counterpartiesQuery = useQuery({
    queryKey: directoryCounterpartiesQueryKeys.list(CUSTOMER_LIST_PARAMS),
    queryFn: () => fetchDirectoryCounterparties(CUSTOMER_LIST_PARAMS),
    enabled: open,
    staleTime: 30_000,
  })

  const customers = useMemo(
    () => (counterpartiesQuery.data?.data ?? []).filter((counterparty) => counterparty.type === "customer"),
    [counterpartiesQuery.data?.data]
  )

  const selectedCustomerMissing = Boolean(
    project?.customerCounterpartyId &&
      project.customerName &&
      !customers.some((customer) => customer.id === project.customerCounterpartyId)
  )

  useEffect(() => {
    if (!open) return
    setForm(initialState(project))
    setError(null)
  }, [open, project])

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = form.title.trim()
    if (!title) {
      setError("Укажите название проекта")
      return
    }

    try {
      setError(null)
      await onSubmit(toMutationInput(form))
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const customerSelectValue = form.customerCounterpartyId || NO_CUSTOMER_VALUE
  const customerSelectDisabled = saving || counterpartiesQuery.isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать проект" : "Новый проект"}</DialogTitle>
          <DialogDescription>
            Заполните обязательные поля. Остальные данные можно добавить позже.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="project-title">Название проекта</FieldLabel>
              <Input
                id="project-title"
                maxLength={200}
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-customer">Заказчик</FieldLabel>
              <Select
                disabled={customerSelectDisabled}
                value={customerSelectValue}
                onValueChange={(value) =>
                  setField("customerCounterpartyId", value === NO_CUSTOMER_VALUE ? "" : value)
                }
              >
                <SelectTrigger id="project-customer" className="w-full">
                  <SelectValue placeholder="Выберите заказчика" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CUSTOMER_VALUE}>Без заказчика</SelectItem>
                  {selectedCustomerMissing && project?.customerCounterpartyId ? (
                    <SelectItem value={project.customerCounterpartyId}>{project.customerName}</SelectItem>
                  ) : null}
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {counterpartiesQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Загружаем заказчиков...</p>
              ) : customers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  В справочнике контрагентов нет активных заказчиков.
                </p>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="project-status">Статус</FieldLabel>
              <Select value={form.status} onValueChange={(value) => setField("status", value)}>
                <SelectTrigger id="project-status" className="w-full">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="project-address">Адрес объекта</FieldLabel>
              <Input
                id="project-address"
                maxLength={400}
                value={form.address}
                onChange={(event) => setField("address", event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-start-date">Дата начала</FieldLabel>
              <Input
                id="project-start-date"
                maxLength={20}
                value={form.startDate}
                onChange={(event) => setField("startDate", event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-end-date">Дата окончания</FieldLabel>
              <Input
                id="project-end-date"
                maxLength={20}
                value={form.endDate}
                onChange={(event) => setField("endDate", event.target.value)}
              />
            </Field>
          </FieldGroup>

          {counterpartiesQuery.error ? (
            <FieldError>Не удалось загрузить список заказчиков</FieldError>
          ) : null}
          <FieldError>{error}</FieldError>

          <DialogFooter showCloseButton={false}>
            <Button disabled={saving} type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
