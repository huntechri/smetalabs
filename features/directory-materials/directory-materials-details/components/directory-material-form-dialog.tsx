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
  DirectoryMaterial,
  DirectoryMaterialMutationInput,
} from "@/features/directory-materials/types"

type DirectoryMaterialFormState = {
  name: string
  unit: string
  price: string
  category: string
  subcategory: string
  code: string
  supplierName: string
}

const emptyState: DirectoryMaterialFormState = {
  name: "",
  unit: "",
  price: "",
  category: "",
  subcategory: "",
  code: "",
  supplierName: "",
}

function getInitialState(material: DirectoryMaterial | null): DirectoryMaterialFormState {
  if (!material) return emptyState

  return {
    name: material.name,
    unit: material.unitLabel || material.unit,
    price: String(material.priceAmount),
    category: material.category,
    subcategory: material.subcategory ?? "",
    code: material.code ?? "",
    supplierName: material.supplierName ?? "",
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось сохранить материал"
}

export function DirectoryMaterialFormDialog({
  material,
  open,
  onOpenChange,
  saving,
  onSubmit,
}: {
  material: DirectoryMaterial | null
  open: boolean
  onOpenChange: (open: boolean) => void
  saving: boolean
  onSubmit: (input: DirectoryMaterialMutationInput) => Promise<void>
}) {
  const [form, setForm] = useState<DirectoryMaterialFormState>(() =>
    getInitialState(material)
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(getInitialState(material))
      setError(null)
    }
  }, [open, material])

  const updateField = (field: keyof DirectoryMaterialFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = form.name.trim()
    const unit = form.unit.trim()
    const category = form.category.trim()
    const subcategory = form.subcategory.trim()
    const code = form.code.trim()
    const supplierName = form.supplierName.trim()
    const price = Number(form.price)

    if (!name || !unit || !category) {
      setError("Заполните название, единицу измерения и категорию")
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Цена должна быть неотрицательным числом")
      return
    }

    setError(null)

    try {
      await onSubmit({
        name,
        unit,
        price,
        category,
        subcategory: subcategory || null,
        code: code || null,
        supplierName: supplierName || null,
        imageUrl: material?.imageUrl ?? null,
        description: material?.description ?? null,
        sourceName: material?.metadata.sourceName ?? null,
        sourceExternalRowKey: material?.metadata.sourceExternalRowKey ?? null,
        currencyCode: material?.currencyCode ?? "RUB",
      })
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{material ? "Редактировать материал" : "Новый материал"}</DialogTitle>
          <DialogDescription>
            Заполните обязательные поля. Пустой материал не будет сохранён.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="directory-material-name">Название</Label>
              <Input
                id="directory-material-name"
                maxLength={240}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Например: Цемент М500"
                value={form.name}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-material-unit">Ед. изм.</Label>
              <Input
                id="directory-material-unit"
                maxLength={80}
                onChange={(event) => updateField("unit", event.target.value)}
                placeholder="кг"
                value={form.unit}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-material-price">Цена</Label>
              <Input
                id="directory-material-price"
                min="0"
                onChange={(event) => updateField("price", event.target.value)}
                placeholder="0"
                step="0.01"
                type="number"
                value={form.price}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-material-category">Категория</Label>
              <Input
                id="directory-material-category"
                maxLength={120}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="Сухие смеси"
                value={form.category}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-material-subcategory">Подкатегория</Label>
              <Input
                id="directory-material-subcategory"
                maxLength={120}
                onChange={(event) => updateField("subcategory", event.target.value)}
                placeholder="Цемент"
                value={form.subcategory}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-material-code">Код</Label>
              <Input
                id="directory-material-code"
                maxLength={80}
                onChange={(event) => updateField("code", event.target.value)}
                placeholder="MAT-001"
                value={form.code}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-material-supplier">Поставщик</Label>
              <Input
                id="directory-material-supplier"
                maxLength={160}
                onChange={(event) => updateField("supplierName", event.target.value)}
                placeholder="Название поставщика"
                value={form.supplierName}
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
