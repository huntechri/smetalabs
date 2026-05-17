import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DirectoryMaterial } from "@/features/directory-materials/types"
import { ImageIcon } from "lucide-react"
import {
  ArchiveIcon,
  GearSixIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react"

export function DirectoryMaterialsRow({
  onArchive,
  onEdit,
  onInsertAfter,
  row,
  saving,
}: {
  onArchive: (row: DirectoryMaterial) => void
  onEdit: (row: DirectoryMaterial) => void
  onInsertAfter: (row: DirectoryMaterial) => void
  row: DirectoryMaterial
  saving: boolean
}) {
  const priceLabel = `${row.price.toLocaleString("ru-RU")} ${row.currencyCode}`

  return (
    <Card
      size="sm"
      className="mx-3 my-1.5 rounded-md bg-transparent p-0 transition-colors hover:bg-muted/50"
    >
      <CardContent className="grid min-w-0 gap-3 p-3 xl:grid-cols-[minmax(520px,1.15fr)_minmax(520px,0.85fr)]">
        <div className="grid min-w-0 gap-3 rounded-md border border-border p-2 sm:grid-cols-[minmax(96px,0.18fr)_minmax(0,1fr)]">
          <div className="min-w-0 rounded-md border border-border p-2">
            <span className="mb-1 block text-xs text-muted-foreground uppercase">
              Код
            </span>
            <div className="break-words font-mono text-xs font-medium leading-snug">
              {row.code || "—"}
            </div>
          </div>
          <div className="min-w-0 rounded-md border border-border p-2">
            <span className="mb-1 block text-xs text-muted-foreground uppercase">
              Название
            </span>
            <div className="break-words text-sm font-medium leading-snug">
              {row.name}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-[minmax(220px,0.75fr)_minmax(280px,1fr)]">
          <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
            <div className="text-xs text-muted-foreground uppercase">
              Ед. изм / Цена
            </div>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums">
                <span className="text-muted-foreground">Ед.:</span>
                <span>{row.unit}</span>
              </Badge>
              <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-medium tabular-nums">
                <span className="text-muted-foreground">Цена:</span>
                <span>{priceLabel}</span>
              </Badge>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
            <div className="text-xs text-muted-foreground uppercase">
              Категория / Поставщик
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums">
                <span className="text-muted-foreground">Кат.:</span>
                <span>{row.category}</span>
              </Badge>
              {row.supplierName ? (
                <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums">
                  <span className="text-muted-foreground">Пост.:</span>
                  <span>{row.supplierName}</span>
                </Badge>
              ) : null}
              {row.imageUrl ? (
                <img
                  src={row.imageUrl}
                  alt={row.name}
                  className="h-6 w-6 rounded-md border border-border object-cover"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label={`Действия для ${row.name}`}
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
      </CardContent>
    </Card>
  )
}
