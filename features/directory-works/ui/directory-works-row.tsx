import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DirectoryWork } from "../model/directory-works-model"
import {
  ArchiveIcon,
  GearSixIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react"

export function DirectoryWorksRow({
  row,
  saving,
  onArchive,
  onEdit,
  onInsertAfter,
}: {
  row: DirectoryWork
  saving: boolean
  onArchive: (row: DirectoryWork) => void
  onEdit: (row: DirectoryWork) => void
  onInsertAfter: (row: DirectoryWork) => void
}) {
  const code = row.code?.trim()
  const priceLabel = `${row.rate.toLocaleString("ru-RU")} ₽`

  return (
    <div className="mx-3 my-1.5 grid gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/50 xl:grid-cols-[minmax(520px,1.15fr)_minmax(520px,0.85fr)]">
      <div className="grid min-w-0 gap-3 rounded-md border border-border p-2 sm:grid-cols-[minmax(96px,0.18fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-md border border-border p-2">
          <span className="mb-1 block text-xs text-muted-foreground uppercase">
            Код
          </span>
          <div className="font-mono text-xs leading-snug font-medium break-words">
            {code || "—"}
          </div>
        </div>
        <div className="min-w-0 rounded-md border border-border p-2">
          <span className="mb-1 block text-xs text-muted-foreground uppercase">
            Название
          </span>
          <div className="text-sm leading-snug font-medium break-words">
            {row.title}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-[minmax(220px,0.75fr)_minmax(280px,1fr)]">
        <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
          <div className="text-xs text-muted-foreground uppercase">
            Ед. изм / Расценка
          </div>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums"
            >
              <span className="text-muted-foreground">Ед.:</span>
              <span>{row.unit}</span>
            </Badge>
            <Badge
              variant="outline"
              className="gap-1 rounded-md px-1.5 py-0.5 font-medium tabular-nums"
            >
              <span className="text-muted-foreground">Цена:</span>
              <span>{priceLabel}</span>
            </Badge>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
          <div className="text-xs text-muted-foreground uppercase text-start">
            Категория
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums"
            >
              <span className="text-muted-foreground">Кат.:</span>
              <span>{row.category}</span>
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Действия для ${row.title}`}
                  className="ml-auto"
                  disabled={saving}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <GearSixIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onInsertAfter(row)}>
                  <PlusIcon />
                  Добавить ниже
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(row)}>
                  <PencilSimpleIcon />
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onArchive(row)}
                  variant="destructive"
                >
                  <ArchiveIcon />
                  Архивировать
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
