import type { FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatMoney } from "@/lib/formatters"
import type { ProjectEstimateOptionRow } from "@/types/project-estimate-content"
import type { WorkDialogState } from "@/features/estimates/estimate-details/types"

export function EstimateWorkPickerDialog({
  state,
  query,
  saving,
  options,
  loading,
  onQueryChange,
  onOpenChange,
  onSelect,
  onManualSubmit,
  onDirectorySubmit,
}: {
  state: WorkDialogState
  query: string
  saving: boolean
  options: ProjectEstimateOptionRow[]
  loading: boolean
  onQueryChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onSelect: (row: ProjectEstimateOptionRow) => void
  onManualSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDirectorySubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Добавить работу</DialogTitle>
          <DialogDescription>
            Выберите работу из справочника или добавьте вручную.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Поиск работ"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />

        {state.selected ? (
          <form onSubmit={onDirectorySubmit} className="grid gap-3 rounded-md border p-3">
            <div className="text-xs font-medium break-words">
              {state.selected.title}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="quantity" defaultValue="1" placeholder="Количество" />
              <Input name="price" defaultValue={state.selected.price} placeholder="Цена" />
            </div>
            <Button disabled={saving} type="submit">
              Добавить в смету
            </Button>
          </form>
        ) : null}

        <div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border p-2">
          {loading ? (
            <div className="p-2 text-xs text-muted-foreground">Загрузка работ...</div>
          ) : options.length ? (
            options.map((work) => (
              <div key={work.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium break-words">{work.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {work.code ?? "Без кода"} · {work.unitLabel} · {formatMoney(work.price)} · {work.category}
                  </div>
                </div>
                <Button size="sm" type="button" onClick={() => onSelect(work)}>
                  Добавить
                </Button>
              </div>
            ))
          ) : (
            <div className="p-2 text-xs text-muted-foreground">Работы не найдены.</div>
          )}
        </div>

        <form onSubmit={onManualSubmit} className="grid gap-3 rounded-md border p-3">
          <div className="text-xs font-medium">Добавить вручную</div>
          <Input name="title" placeholder="Название" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input name="unit" placeholder="Ед. изм." />
            <Input name="quantity" defaultValue="1" placeholder="Количество" />
            <Input name="price" defaultValue="0" placeholder="Цена" />
          </div>
          <Input name="category" placeholder="Категория" />
          <Textarea name="notes" placeholder="Примечание" />
          <Button disabled={saving} type="submit" variant="outline">
            Добавить вручную
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
