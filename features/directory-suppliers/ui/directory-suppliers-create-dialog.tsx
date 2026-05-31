"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DIRECTORY_SUPPLIER_COLOR_PRESETS,
  buildDirectorySupplierMutationInput,
  formatSupplierColorInput,
  getDirectorySupplierInitialFormState,
  isValidSupplierColorHex,
  type DirectorySupplier,
  type DirectorySupplierFormState,
  type DirectorySupplierLegalStatus,
  type DirectorySupplierMutationInput,
} from "../model/directory-suppliers-model"

type DirectorySuppliersFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: DirectorySupplierMutationInput) => Promise<void>
  saving: boolean
  supplier?: DirectorySupplier | null
}

export function DirectorySuppliersFormDialog({
  open,
  onOpenChange,
  onSubmit,
  saving,
  supplier,
}: DirectorySuppliersFormDialogProps) {
  const [formState, setFormState] = useState<DirectorySupplierFormState>(() =>
    getDirectorySupplierInitialFormState()
  )

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return
    setFormState(getDirectorySupplierInitialFormState(supplier))
  }, [open, supplier])
  /* eslint-enable react-hooks/set-state-in-effect */

  const setField = <K extends keyof DirectorySupplierFormState>(
    key: K,
    value: DirectorySupplierFormState[K]
  ) => {
    setFormState((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    await onSubmit(buildDirectorySupplierMutationInput(formState))
  }

  const isValidHex = isValidSupplierColorHex(formState.color)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {supplier ? "Редактировать поставщика" : "Новый поставщик"}
          </DialogTitle>
          <DialogDescription>
            Заполните основные данные поставщика.
          </DialogDescription>
        </DialogHeader>
 
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-name">Наименование</Label>
            <Input
              id="supplier-name"
              placeholder="Введите наименование"
              value={formState.name}
              onChange={(event) => setField("name", event.target.value)}
            />
          </div>
 
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier-status">Тип</Label>
              <Select
                value={formState.legalStatus}
                onValueChange={(value) =>
                  setField("legalStatus", value as DirectorySupplierLegalStatus)
                }
              >
                <SelectTrigger id="supplier-status" className="w-full">
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="juridical">Юр. лицо</SelectItem>
                  <SelectItem value="individual">Физ. лицо</SelectItem>
                </SelectContent>
              </Select>
            </div>
 
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier-color">Цвет</Label>
              <div className="flex gap-2">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-input">
                  <input
                    type="color"
                    id="supplier-color-picker"
                    className="absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer bg-transparent p-0 border-0"
                    value={
                      formState.color.startsWith("#") && formState.color.length === 7
                        ? formState.color
                        : "#64748B"
                    }
                    onChange={(event) => setField("color", event.target.value.toUpperCase())}
                  />
                </div>
                <Input
                  id="supplier-color"
                  type="text"
                  placeholder="#64748B"
                  value={formState.color}
                  onChange={(event) => {
                    setField("color", formatSupplierColorInput(event.target.value))
                  }}
                  className="font-mono uppercase"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {DIRECTORY_SUPPLIER_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    className={cn(
                      "h-6 w-6 rounded-full border border-muted-foreground/30 transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-ring",
                      formState.color.toLowerCase() === preset.value.toLowerCase() &&
                        "ring-2 ring-ring scale-110"
                    )}
                    style={{ backgroundColor: preset.value }}
                    onClick={() => setField("color", preset.value)}
                  />
                ))}
              </div>
              {!isValidHex && formState.color && (
                <span className="text-xs text-destructive">Формат HEX: #RRGGBB</span>
              )}
            </div>
          </div>
 
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier-inn">ИНН</Label>
              <Input
                id="supplier-inn"
                placeholder="Введите ИНН"
                value={formState.inn}
                onChange={(event) => setField("inn", event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier-phone">Телефон</Label>
              <Input
                id="supplier-phone"
                placeholder="+7 (XXX) XXX-XX-XX"
                value={formState.phone}
                onChange={(event) => setField("phone", event.target.value)}
              />
            </div>
          </div>
 
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-email">Email</Label>
            <Input
              id="supplier-email"
              placeholder="mail@example.com"
              value={formState.email}
              onChange={(event) => setField("email", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-address">Адрес</Label>
            <Input
              id="supplier-address"
              placeholder="Введите адрес"
              value={formState.address}
              onChange={(event) => setField("address", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-notes">Примечание</Label>
            <Textarea
              id="supplier-notes"
              placeholder="Дополнительная информация"
              value={formState.notes}
              onChange={(event) => setField("notes", event.target.value)}
            />
          </div>
        </div>
 
        <DialogFooter showCloseButton={false}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !formState.name.trim() || !isValidHex}
          >
            {supplier ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const DirectorySuppliersCreateDialog = DirectorySuppliersFormDialog
