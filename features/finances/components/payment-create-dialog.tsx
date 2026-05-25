"use client"

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
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { financeSections } from "@/features/finances/__mocks__/finances"
import type { PaymentStatus } from "@/features/finances/__mocks__/finances"

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
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const data = {
      sectionId: formData.get("sectionId") as string,
      date: formData.get("date") as string,
      amount: formData.get("amount") as string,
      status: formData.get("status") as PaymentStatus,
      purpose: formData.get("purpose") as string,
    }

    // eslint-disable-next-line no-console
    console.log("Добавление платежа:", data)

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
              <FieldLabel htmlFor="date">Дата</FieldLabel>
              <Input
                id="date"
                name="date"
                type="date"
                className="w-full"
                required
              />
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
