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
import type { ProjectEstimateMaterialOptionRow } from "@/types/project-estimate-content"
import type { MaterialDialogState } from "@/features/estimates/estimate-details/types"

export function EstimateMaterialPickerDialog({
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
  state: MaterialDialogState
  query: string
  saving: boolean
  options: ProjectEstimateMaterialOptionRow[]
  loading: boolean
  onQueryChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onSelect: (row: ProjectEstimateMaterialOptionRow) => void
  onManualSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDirectorySubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[82vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Добавить материал</DialogTitle>
          <DialogDescription>
            Материал добавится внутрь выбранной работы.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Поиск материалов"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />

        <div className="grid gap-2 rounded-md border p-2">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground">Загрузка материалов...</div>
          ) : options.length ? (
            options.map((material) => (
              <div key={material.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{material.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {material.code ?? "Без кода"} · {material.unitLabel} · {formatMoney(material.price)} · {material.category}
                    {material.supplierName ? ` · ${material.supplierName}` : ""}
                  </div>
                </div>
                <Button size="sm" onClick={() => onSelect(material)}>
                  Добавить
                </Button>
              </div>
            ))
          ) : (
            <div className="p-2 text-sm text-muted-foreground">Материалы не найдены.</div>
          )}
        </div>

        {state.selected ? (
          <form onSubmit={onDirectorySubmit} className="grid gap-3 rounded-md border p-3">
            <div className="text-sm font-medium">{state.selected.title}</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input name="quantity" placeholder="Количество материала" defaultValue="1" />
              <Input name="consumption" placeholder="Расход" />
              <Input name="price" defaultValue={state.selected.price} />
            </div>
            <Button disabled={saving}>Подтвердить</Button>
          </form>
        ) : null}

        <form onSubmit={onManualSubmit} className="grid gap-3 rounded-md border p-3">
          <div className="text-sm font-medium">Добавить вручную</div>
          <Input name="title" placeholder="Название" />
          <div className="grid gap-3 sm:grid-cols-4">
            <Input name="unit" placeholder="Ед. изм." />
            <Input name="quantity" placeholder="Количество" defaultValue="1" />
            <Input name="consumption" placeholder="Расход" />
            <Input name="price" defaultValue="0" />
          </div>
          <Input name="supplierName" placeholder="Поставщик" />
          <Textarea name="notes" placeholder="Примечание" />
          <Button disabled={saving} variant="outline">
            Добавить вручную
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
