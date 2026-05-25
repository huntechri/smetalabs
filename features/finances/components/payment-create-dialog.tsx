"use client"

import { useState } from "react"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
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
import { financeSections } from "@/features/finances/__mocks__/finances"
import type { PaymentStatus } from "@/features/finances/types"

const paymentStatusOptions: { value: PaymentStatus; label: string }[] = [
  { value: "conducted", label: "Проведён" },
  { value: "processing", label: "В обработке" },
  { value: "cancelled", label: "Отменён" },
  { value: "expected", label: "Ожидается" },
]

interface PaymentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentCreateDialog({
  open,
  onOpenChange,
}: PaymentCreateDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const data = {
      sectionId: formData.get("sectionId") as string,
      date: toIsoDate(selectedDate),
      amount: formData.get("amount") as string,
      status: formData.get("status") as PaymentStatus,
      purpose: formData.get("purpose") as string,
    }

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("Добавление платежа:", data)
    }

    setSelectedDate(undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Добавить платёж</DialogTitle>
            <DialogDescription>
              Заполните данные платежа. Он будет добавлен в выбранный раздел.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="sectionId">Раздел</FieldLabel>
              <Select name="sectionId" required defaultValue={financeSections[0]?.sectionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите раздел" />
                </SelectTrigger>
                <SelectContent>
                  {financeSections.map((section) => (
                    <SelectItem key={section.sectionId} value={section.sectionId}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Дата</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-1.5 font-normal"
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
            </Field>
            <Field>
              <FieldLabel htmlFor="amount">Сумма (₽)</FieldLabel>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                className="w-full"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="status">Статус</FieldLabel>
              <Select name="status" required defaultValue="expected">
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
            </Field>
            <Field>
              <FieldLabel htmlFor="purpose">Назначение</FieldLabel>
              <Textarea
                id="purpose"
                name="purpose"
                placeholder="Аванс по договору…"
                className="w-full"
                rows={3}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit">Добавить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
