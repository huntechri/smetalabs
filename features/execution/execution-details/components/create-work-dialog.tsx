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
import { useState } from "react"

interface CreateWorkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: {
    title: string
    unit: string
    quantity: number
    price: number
  }) => void
}

export function CreateWorkDialog({
  open,
  onOpenChange,
  onConfirm,
}: CreateWorkDialogProps) {
  const [title, setTitle] = useState("")
  const [unit, setUnit] = useState("")
  const [quantity, setQuantity] = useState("0")
  const [price, setPrice] = useState("0")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !unit.trim()) return

    onConfirm({
      title: title.trim(),
      unit: unit.trim(),
      quantity: Number(quantity) || 0,
      price: Number(price) || 0,
    })

    // Reset fields
    setTitle("")
    setUnit("")
    setQuantity("0")
    setPrice("0")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Добавить дополнительную работу</DialogTitle>
            <DialogDescription>
              Введите параметры новой работы. Она будет создана в первом разделе сметы.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Наименование</FieldLabel>
              <Input
                id="title"
                placeholder="Монтаж перегородки"
                className="w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="unit">Единица измерения</FieldLabel>
              <Input
                id="unit"
                placeholder="м²"
                className="w-full"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="quantity">План. кол-во</FieldLabel>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="price">План. цена (₽)</FieldLabel>
                <Input
                  id="price"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit">Добавить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
