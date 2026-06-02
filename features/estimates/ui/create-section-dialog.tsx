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

interface CreateSectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: { name: string }) => void
}

export function CreateSectionDialog({
  open,
  onOpenChange,
  onConfirm,
}: CreateSectionDialogProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = formData.get("name") as string

    if (name) {
      onConfirm({ name })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Создать новый раздел</DialogTitle>
            <DialogDescription>
              Введите название раздела. Номер будет присвоен автоматически.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Название</FieldLabel>
              <Input
                id="name"
                name="name"
                placeholder="Подготовительные работы"
                className="w-full"
                required
                autoFocus
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit">Создать</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
