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
      <DialogContent className="max-h-[82vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Добавить работу</DialogTitle>
          <DialogDescription>
            Выберите строку из справочника или заполните ручную работу.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Поиск работ"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />

        <div className="grid gap-2 rounded-md border p-2">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground">Загрузка работ...</div>
          ) : options.length ? (
            options.map((work) => (
              <div key={work.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{work.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {work.code ?? "Без кода"} · {work.unitLabel} · {formatMoney(work.price)} · {work.category}
                  </div>
                </div>
                <Button size="sm" onClick={() => onSelect(work)}>
                  Добавить
                </Button>
              </div>
            ))
          ) : (
            <div className="p-2 text-sm text-muted-foreground">Работы не найдены.</div>
          )}
        </div>

        {state.selected ? (
          <form onSubmit={onDirectorySubmit} className="grid gap-3 rounded-md border p-3">
            <div className="text-sm font-medium">{state.selected.title}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="quantity" defaultValue="1" />
              <Input name="price" defaultValue={state.selected.price} />
            </div>
            <Button disabled={saving}>Подтвердить</Button>
          </form>
        ) : null}

        <form onSubmit={onManualSubmit} className="grid gap-3 rounded-md border p-3">
          <div className="text-sm font-medium">Добавить вручную</div>
          <Input name="title" placeholder="Название" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input name="unit" placeholder="Ед. изм." />
            <Input name="quantity" defaultValue="1" />
            <Input name="price" defaultValue="0" />
          </div>
          <Input name="category" placeholder="Категория" />
          <Textarea name="notes" placeholder="Примечание" />
          <Button disabled={saving} variant="outline">
            Добавить вручную
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
