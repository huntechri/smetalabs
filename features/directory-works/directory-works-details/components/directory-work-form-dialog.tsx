"use client"

import { type FormEvent, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  DirectoryWork,
  DirectoryWorkMutationInput,
} from "@/features/directory-works/types"

type DirectoryWorkFormState = {
  title: string
  unit: string
  rate: string
  category: string
  subcategory: string
}

const emptyState: DirectoryWorkFormState = {
  title: "",
  unit: "",
  rate: "",
  category: "",
  subcategory: "",
}

function getInitialState(work: DirectoryWork | null): DirectoryWorkFormState {
  if (!work) return emptyState

  return {
    title: work.title,
    unit: work.unitLabel || work.unit,
    rate: String(work.rateAmount),
    category: work.category,
    subcategory: work.subcategory ?? "",
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось сохранить работу"
}

export function DirectoryWorkFormDialog({
  insertAfterWork,
  open,
  onOpenChange,
  work,
  saving,
  onSubmit,
}: {
  insertAfterWork?: DirectoryWork | null
  open: boolean
  onOpenChange: (open: boolean) => void
  work: DirectoryWork | null
  saving: boolean
  onSubmit: (input: DirectoryWorkMutationInput) => Promise<void>
}) {
  const [form, setForm] = useState<DirectoryWorkFormState>(() =>
    getInitialState(work)
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(getInitialState(work))
      setError(null)
    }
  }, [open, work])

  const updateField = (field: keyof DirectoryWorkFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = form.title.trim()
    const unit = form.unit.trim()
    const category = form.category.trim()
    const subcategory = form.subcategory.trim()
    const rate = Number(form.rate)

    if (!title || !unit || !category) {
      setError("Заполните название, единицу измерения и категорию")
      return
    }

    if (!Number.isFinite(rate) || rate < 0) {
      setError("Расценка должна быть неотрицательным числом")
      return
    }

    setError(null)

    try {
      await onSubmit({
        title,
        unit,
        rate,
        category,
        subcategory: subcategory || null,
        code: work?.code ?? null,
        description: work?.description ?? null,
        includedOperations: work?.includedOperations ?? null,
        excludedOperations: work?.excludedOperations ?? null,
        sourceName: work?.metadata.sourceName ?? null,
        sourceExternalRowKey: work?.metadata.sourceExternalRowKey ?? null,
        currencyCode: work?.currencyCode ?? "RUB",
        priceKind: work?.priceKind ?? "base",
      })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const title = work
    ? "Редактировать работу"
    : insertAfterWork
      ? "Добавить работу ниже"
      : "Новая работа"

  const description = insertAfterWork
    ? `Новая работа будет добавлена ниже: ${insertAfterWork.title}`
    : "Заполните обязательные поля. Пустая работа не будет сохранена в справочник."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="directory-work-title">Название</Label>
              <Input
                id="directory-work-title"
                maxLength={240}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Например: Штукатурка стен"
                value={form.title}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-work-unit">Ед. изм.</Label>
              <Input
                id="directory-work-unit"
                maxLength={80}
                onChange={(event) => updateField("unit", event.target.value)}
                placeholder="м²"
                value={form.unit}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-work-rate">Расценка</Label>
              <Input
                id="directory-work-rate"
                min="0"
                onChange={(event) => updateField("rate", event.target.value)}
                placeholder="0"
                step="0.01"
                type="number"
                value={form.rate}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-work-category">Категория</Label>
              <Input
                id="directory-work-category"
                maxLength={120}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="Отделочные работы"
                value={form.category}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-work-subcategory">Подкатегория</Label>
              <Input
                id="directory-work-subcategory"
                maxLength={120}
                onChange={(event) =>
                  updateField("subcategory", event.target.value)
                }
                placeholder="Штукатурные работы"
                value={form.subcategory}
              />
            </div>
          </div>

          {error ? <p className="text-xs/relaxed text-destructive">{error}</p> : null}

          <DialogFooter showCloseButton={false}>
            <Button
              disabled={saving}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
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
