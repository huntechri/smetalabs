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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  buildDirectoryMaterialMutationInput,
  getDirectoryMaterialInitialFormState,
  validateDirectoryMaterialFormState,
  type DirectoryMaterial,
  type DirectoryMaterialFormState,
  type DirectoryMaterialMutationInput,
} from "@/features/directory-materials/model/directory-materials-model"

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Не удалось сохранить материал"
}

export function DirectoryMaterialFormDialog({
  material,
  open,
  onOpenChange,
  saving,
  title,
  onSubmit,
}: {
  material: DirectoryMaterial | null
  open: boolean
  onOpenChange: (open: boolean) => void
  saving: boolean
  title?: string
  onSubmit: (input: DirectoryMaterialMutationInput) => Promise<void>
}) {
  const [form, setForm] = useState<DirectoryMaterialFormState>(() =>
    getDirectoryMaterialInitialFormState(material)
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(getDirectoryMaterialInitialFormState(material))
      setError(null)
    }
  }, [open, material])

  const updateField = (
    field: keyof DirectoryMaterialFormState,
    value: string
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateDirectoryMaterialFormState(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)

    try {
      await onSubmit(buildDirectoryMaterialMutationInput(form, material))
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {title ?? (material ? "Редактировать материал" : "Новый материал")}
          </DialogTitle>
          <DialogDescription>
            Заполните обязательные поля. Пустой материал не будет сохранён.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="directory-material-name">
                Название
              </FieldLabel>
              <Input
                id="directory-material-name"
                maxLength={240}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Например: Цемент М500"
                value={form.name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="directory-material-unit">
                Ед. изм.
              </FieldLabel>
              <Input
                id="directory-material-unit"
                maxLength={80}
                onChange={(event) => updateField("unit", event.target.value)}
                placeholder="кг"
                value={form.unit}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="directory-material-price">Цена</FieldLabel>
              <Input
                id="directory-material-price"
                min="0"
                onChange={(event) => updateField("price", event.target.value)}
                placeholder="0"
                step="0.01"
                type="number"
                value={form.price}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="directory-material-category">
                Категория
              </FieldLabel>
              <Input
                id="directory-material-category"
                maxLength={120}
                onChange={(event) =>
                  updateField("category", event.target.value)
                }
                placeholder="Сухие смеси"
                value={form.category}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="directory-material-subcategory">
                Подкатегория
              </FieldLabel>
              <Input
                id="directory-material-subcategory"
                maxLength={120}
                onChange={(event) =>
                  updateField("subcategory", event.target.value)
                }
                placeholder="Цемент"
                value={form.subcategory}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="directory-material-code">Код</FieldLabel>
              <Input
                id="directory-material-code"
                maxLength={80}
                onChange={(event) => updateField("code", event.target.value)}
                placeholder="MAT-001"
                value={form.code}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="directory-material-supplier">
                Поставщик
              </FieldLabel>
              <Input
                id="directory-material-supplier"
                maxLength={160}
                onChange={(event) =>
                  updateField("supplierName", event.target.value)
                }
                placeholder="Название поставщика"
                value={form.supplierName}
              />
            </Field>
          </FieldGroup>

          <FieldError>{error}</FieldError>

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
