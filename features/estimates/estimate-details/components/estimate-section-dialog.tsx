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

export function EstimateSectionDialog({
  open,
  saving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Создать раздел</DialogTitle>
            <DialogDescription>
              Номер раздела будет назначен автоматически.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input name="title" placeholder="Название раздела" required />
          </div>
          <DialogFooter>
            <Button disabled={saving}>Создать</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
