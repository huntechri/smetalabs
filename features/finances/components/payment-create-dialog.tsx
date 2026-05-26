"use client"

import { useState, useEffect } from "react"
import { CalendarDots } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  toDateValue,
  toIsoDate,
  formatDisplayDate,
} from "@/features/finances/lib/date-utils"
import type { FinancePayment, FinanceSection, PaymentStatus } from "@/features/finances/types"

const paymentStatusOptions: { value: PaymentStatus; label: string }[] = [
  { value: "conducted", label: "Проведён" },
  { value: "processing", label: "В обработке" },
  { value: "cancelled", label: "Отменён" },
  { value: "expected", label: "Ожидается" },
]

interface PaymentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: FinanceSection[]
  editingPayment?: FinancePayment | null
  onSave: (payment: Omit<FinancePayment, "paymentId"> & { paymentId?: string }) => void
}

export function PaymentCreateDialog({
  open,
  onOpenChange,
  sections,
  editingPayment = null,
  onSave,
}: PaymentCreateDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  // Sync date state with editing payment
  useEffect(() => {
    if (open) {
      if (editingPayment) {
        setSelectedDate(toDateValue(editingPayment.date))
      } else {
        setSelectedDate(new Date()) // Default to today for new payments
      }
    }
  }, [open, editingPayment])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const dateStr = toIsoDate(selectedDate) || toIsoDate(new Date())

    onSave({
      ...(editingPayment ? { paymentId: editingPayment.paymentId } : {}),
      sectionId: formData.get("sectionId") as string,
      date: dateStr,
      amount: Number(formData.get("amount")),
      status: formData.get("status") as PaymentStatus,
      purpose: (formData.get("purpose") as string) || "",
    })

    setSelectedDate(undefined)
    onOpenChange(false)
  }

  const hasSections = sections.length > 0
  const titleText = editingPayment ? "Редактировать платёж" : "Добавить платёж"
  const descriptionText = editingPayment
    ? "Отредактируйте данные платежа ниже."
    : "Заполните данные платежа. Он будет добавлен в выбранный раздел."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form
          key={editingPayment?.paymentId || "create"}
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <DialogHeader>
            <DialogTitle>{titleText}</DialogTitle>
            <DialogDescription>{descriptionText}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sectionId">Раздел сметы (Этап)</Label>
              <Select
                name="sectionId"
                required
                defaultValue={editingPayment?.sectionId === null ? "general_advance" : (editingPayment?.sectionId ?? (hasSections ? sections[0].sectionId : undefined))}
                disabled={!hasSections}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={hasSections ? "Выберите раздел" : "Нет доступных разделов"} />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.sectionId} value={section.sectionId}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Дата платежа</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-1.5 font-normal"
                    type="button"
                  >
                    <CalendarDots className="size-4 text-muted-foreground" />
                    {selectedDate
                      ? formatDisplayDate(toIsoDate(selectedDate))
                      : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Сумма платежа (₽)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                className="w-full"
                required
                defaultValue={editingPayment?.amount ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Статус</Label>
              <Select
                name="status"
                required
                defaultValue={editingPayment?.status ?? "conducted"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purpose">Назначение платежа / Комментарий</Label>
              <Textarea
                id="purpose"
                name="purpose"
                placeholder="Аванс 60% по договору…"
                className="w-full"
                rows={3}
                defaultValue={editingPayment?.purpose ?? ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!hasSections}>
              {editingPayment ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
