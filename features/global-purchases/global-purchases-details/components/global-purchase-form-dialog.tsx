"use client"

import { type FormEvent, useEffect, useState } from "react"
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
import { fetchProjects } from "@/features/projects/api/projects-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import type {
  GlobalPurchaseMutationInput,
  GlobalPurchaseRow,
  GlobalPurchaseStatus,
} from "@/types/global-purchases"

const statuses: Array<{ value: GlobalPurchaseStatus; label: string }> = [
  { value: "planned", label: "План" },
  { value: "ordered", label: "Заказано" },
  { value: "partially_received", label: "Частично получено" },
  { value: "received", label: "Получено" },
  { value: "cancelled", label: "Отменено" },
]

type FormState = {
  title: string
  unit: string
  planQuantity: string
  planPrice: string
  factQuantity: string
  factPrice: string
  projectId: string
  purchaseDate: string
  status: GlobalPurchaseStatus
  notes: string
}

const emptyState: FormState = {
  title: "",
  unit: "",
  planQuantity: "",
  planPrice: "",
  factQuantity: "",
  factPrice: "",
  projectId: "",
  purchaseDate: "",
  status: "planned",
  notes: "",
}

function getInitialState(purchase: GlobalPurchaseRow | null): FormState {
  if (!purchase) return emptyState
  return {
    title: purchase.title,
    unit: purchase.unit,
    planQuantity: String(purchase.planQuantity),
    planPrice: String(purchase.planPrice),
    factQuantity: purchase.factQuantity === null ? "" : String(purchase.factQuantity),
    factPrice: purchase.factPrice === null ? "" : String(purchase.factPrice),
    projectId: purchase.projectId ?? "",
    purchaseDate: purchase.purchaseDate ?? "",
    status: purchase.status,
    notes: purchase.notes ?? "",
  }
}

function parseNumber(value: string) {
  return Number(value.replace(",", "."))
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  return parseNumber(trimmed)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось сохранить закупку"
}

export function GlobalPurchaseFormDialog({
  onOpenChange,
  onSubmit,
  open,
  purchase,
  saving,
  title,
}: {
  onOpenChange: (open: boolean) => void
  onSubmit: (input: GlobalPurchaseMutationInput) => Promise<void>
  open: boolean
  purchase: GlobalPurchaseRow | null
  saving: boolean
  title?: string
}) {
  const [form, setForm] = useState<FormState>(() => getInitialState(purchase))
  const [error, setError] = useState<string | null>(null)
  const projectsQuery = useQuery({
    queryKey: projectsQueryKeys.list({ status: "all", limit: 100, sort: "title_asc" }),
    queryFn: () => fetchProjects({ status: "all", limit: 100, sort: "title_asc" }),
    enabled: open,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (open) {
      setForm(getInitialState(purchase))
      setError(null)
    }
  }, [open, purchase])

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const purchaseTitle = form.title.trim()
    const unit = form.unit.trim()
    const planQuantity = parseNumber(form.planQuantity)
    const planPrice = parseNumber(form.planPrice)
    const factQuantity = parseOptionalNumber(form.factQuantity)
    const factPrice = parseOptionalNumber(form.factPrice)

    if (!purchaseTitle || !unit) {
      setError("Заполните название и единицу измерения")
      return
    }
    if (!Number.isFinite(planQuantity) || planQuantity < 0) {
      setError("Плановое количество должно быть неотрицательным числом")
      return
    }
    if (!Number.isFinite(planPrice) || planPrice < 0) {
      setError("Плановая цена должна быть неотрицательным числом")
      return
    }
    if (factQuantity !== null && (!Number.isFinite(factQuantity) || factQuantity < 0)) {
      setError("Фактическое количество должно быть неотрицательным числом")
      return
    }
    if (factPrice !== null && (!Number.isFinite(factPrice) || factPrice < 0)) {
      setError("Фактическая цена должна быть неотрицательным числом")
      return
    }

    try {
      setError(null)
      await onSubmit({
        title: purchaseTitle,
        unit,
        planQuantity,
        planPrice,
        factQuantity,
        factPrice,
        supplierId: null,
        projectId: form.projectId || null,
        purchaseDate: form.purchaseDate.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      })
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? (purchase ? "Редактировать закупку" : "Новая закупка")}</DialogTitle>
          <DialogDescription>
            Заполните обязательные поля. Поставщик будет подключён позже.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="global-purchase-title">Название</FieldLabel>
              <Input id="global-purchase-title" maxLength={240} onChange={(event) => updateField("title", event.target.value)} placeholder="Например: Цемент М500" value={form.title} />
            </Field>
            <Field><FieldLabel htmlFor="global-purchase-unit">Ед. изм.</FieldLabel><Input id="global-purchase-unit" maxLength={80} onChange={(event) => updateField("unit", event.target.value)} placeholder="кг" value={form.unit} /></Field>
            <Field><FieldLabel htmlFor="global-purchase-date">Дата закупки</FieldLabel><Input id="global-purchase-date" onChange={(event) => updateField("purchaseDate", event.target.value)} type="date" value={form.purchaseDate} /></Field>
            <Field><FieldLabel htmlFor="global-purchase-plan-quantity">План, количество</FieldLabel><Input id="global-purchase-plan-quantity" min="0" onChange={(event) => updateField("planQuantity", event.target.value)} placeholder="0" step="0.001" type="number" value={form.planQuantity} /></Field>
            <Field><FieldLabel htmlFor="global-purchase-plan-price">План, цена</FieldLabel><Input id="global-purchase-plan-price" min="0" onChange={(event) => updateField("planPrice", event.target.value)} placeholder="0" step="0.01" type="number" value={form.planPrice} /></Field>
            <Field><FieldLabel htmlFor="global-purchase-fact-quantity">Факт, количество</FieldLabel><Input id="global-purchase-fact-quantity" min="0" onChange={(event) => updateField("factQuantity", event.target.value)} placeholder="Не заполнено" step="0.001" type="number" value={form.factQuantity} /></Field>
            <Field><FieldLabel htmlFor="global-purchase-fact-price">Факт, цена</FieldLabel><Input id="global-purchase-fact-price" min="0" onChange={(event) => updateField("factPrice", event.target.value)} placeholder="Не заполнено" step="0.01" type="number" value={form.factPrice} /></Field>
            <Field>
              <FieldLabel htmlFor="global-purchase-project">Объект</FieldLabel>
              <select id="global-purchase-project" className="h-8 rounded-md border border-input bg-background px-2 text-sm" onChange={(event) => updateField("projectId", event.target.value)} value={form.projectId}>
                <option value="">Без объекта</option>
                {(projectsQuery.data?.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="global-purchase-status">Статус</FieldLabel>
              <select id="global-purchase-status" className="h-8 rounded-md border border-input bg-background px-2 text-sm" onChange={(event) => updateField("status", event.target.value as GlobalPurchaseStatus)} value={form.status}>
                {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </Field>
            <Field className="sm:col-span-2"><FieldLabel htmlFor="global-purchase-notes">Примечание</FieldLabel><Input id="global-purchase-notes" maxLength={1000} onChange={(event) => updateField("notes", event.target.value)} placeholder="Комментарий к закупке" value={form.notes} /></Field>
          </FieldGroup>
          <FieldError>{error}</FieldError>
          <DialogFooter showCloseButton={false}>
            <Button disabled={saving} onClick={() => onOpenChange(false)} type="button" variant="outline">Отмена</Button>
            <Button disabled={saving} type="submit">{saving ? "Сохранение..." : "Сохранить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
