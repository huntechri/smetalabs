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
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Создать новый раздел</DialogTitle>
            <DialogDescription>
              Введите название раздела. Номер будет присвоен автоматически.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Название
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Подготовительные работы"
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Создать</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
