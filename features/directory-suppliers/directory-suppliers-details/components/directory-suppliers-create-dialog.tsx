"use client"

import { useState } from "react"
import type { SupplierStatus } from "@/types/directory-supplier"
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
  { value: "#059669", label: "Изумрудный" },
]

export function DirectorySuppliersCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState("")
  const [color, setColor] = useState("")
  const [status, setStatus] = useState<SupplierStatus | "">("")
  const [inn, setInn] = useState("")
  const [phone, setPhone] = useState("")

  const handleCreate = () => {
    // TODO: implement save logic
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новый поставщик</DialogTitle>
          <DialogDescription>
            Заполните данные для добавления нового поставщика.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-name">Наименование</Label>
            <Input
              id="supplier-name"
              placeholder="Введите название"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-color">Цвет</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger id="supplier-color" className="w-full">
                <SelectValue placeholder="Выберите цвет" />
              </SelectTrigger>
              <SelectContent>
                {colorPresets.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3.5 w-3.5 rounded-full border border-dashed border-muted-foreground/30"
                        style={{ backgroundColor: c.value }}
                      />
                      <span>{c.label}</span>
                      <span className="text-muted-foreground">{c.value}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-status">Статус</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as SupplierStatus)}
            >
              <SelectTrigger id="supplier-status" className="w-full">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="juridical">Юр. лицо</SelectItem>
                <SelectItem value="individual">Физ. лицо</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-inn">ИНН</Label>
            <Input
              id="supplier-inn"
              placeholder="Введите ИНН"
              value={inn}
              onChange={(e) => setInn(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-phone">Телефон</Label>
            <Input
              id="supplier-phone"
              placeholder="+7 (XXX) XXX-XX-XX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreate}>Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
