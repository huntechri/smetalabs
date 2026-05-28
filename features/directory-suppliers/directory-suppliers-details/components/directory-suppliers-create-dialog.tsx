"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type {
  DirectorySupplier,
  DirectorySupplierLegalStatus,
  DirectorySupplierMutationInput,
} from "@/features/directory-suppliers/types"
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

const colorPresets = [
  { value: "#3B82F6", label: "Синий" },
  { value: "#EF4444", label: "Красный" },
  { value: "#10B981", label: "Зелёный" },
  { value: "#F59E0B", label: "Янтарный" },
  { value: "#8B5CF6", label: "Фиолетовый" },
  { value: "#06B6D4", label: "Голубой" },
  { value: "#EC4899", label: "Розовый" },
  { value: "#EAB308", label: "Жёлтый" },
  { value: "#6366F1", label: "Индиго" },
  { value: "#64748B", label: "Серый" },
]

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
  const [name, setName] = useState("")
  const [color, setColor] = useState("#64748B")
  const [legalStatus, setLegalStatus] =
    useState<DirectorySupplierLegalStatus>("juridical")
  const [inn, setInn] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return

    setName(supplier?.name ?? "")
    setColor(supplier?.color ?? "#64748B")
    setLegalStatus(supplier?.legalStatus ?? "juridical")
    setInn(supplier?.inn ?? "")
    setPhone(supplier?.phone ?? "")
    setEmail(supplier?.email ?? "")
    setAddress(supplier?.address ?? "")
    setNotes(supplier?.notes ?? "")
  }, [open, supplier])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async () => {
    await onSubmit({
      name,
      legalStatus,
      color,
      inn,
      phone,
      email,
      address,
      notes,
    })
  }

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(color)

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
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
 
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier-status">Тип</Label>
              <Select
                value={legalStatus}
                onValueChange={(value) =>
                  setLegalStatus(value as DirectorySupplierLegalStatus)
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
                    value={color.startsWith("#") && color.length === 7 ? color : "#64748B"}
                    onChange={(event) => setColor(event.target.value.toUpperCase())}
                  />
                </div>
                <Input
                  id="supplier-color"
                  type="text"
                  placeholder="#64748B"
                  value={color}
                  onChange={(event) => {
                    let val = event.target.value
                    if (val && !val.startsWith("#")) {
                      val = "#" + val
                    }
                    setColor(val.toUpperCase())
                  }}
                  className="font-mono uppercase"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    className={cn(
                      "h-6 w-6 rounded-full border border-muted-foreground/30 transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-ring",
                      color.toLowerCase() === preset.value.toLowerCase() && "ring-2 ring-ring scale-110"
                    )}
                    style={{ backgroundColor: preset.value }}
                    onClick={() => setColor(preset.value)}
                  />
                ))}
              </div>
              {!isValidHex && color && (
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
                value={inn}
                onChange={(event) => setInn(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier-phone">Телефон</Label>
              <Input
                id="supplier-phone"
                placeholder="+7 (XXX) XXX-XX-XX"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
          </div>
 
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-email">Email</Label>
            <Input
              id="supplier-email"
              placeholder="mail@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-address">Адрес</Label>
            <Input
              id="supplier-address"
              placeholder="Введите адрес"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-notes">Примечание</Label>
            <Textarea
              id="supplier-notes"
              placeholder="Дополнительная информация"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
          <Button onClick={handleSubmit} disabled={saving || !name.trim() || !isValidHex}>
            {supplier ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const DirectorySuppliersCreateDialog = DirectorySuppliersFormDialog
