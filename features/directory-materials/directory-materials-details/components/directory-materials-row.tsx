import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
      className="mx-3 my-1.5 gap-0 rounded-md bg-transparent py-0 transition-colors hover:bg-muted/50"
    >
      <CardHeader className="grid min-w-0 gap-3 p-2 sm:grid-cols-[minmax(96px,0.18fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <CardDescription>Код</CardDescription>
          <CardTitle className="break-words text-sm leading-snug">
            {row.code || "—"}
          </CardTitle>
        </div>
        <div className="min-w-0">
          <CardDescription>Название</CardDescription>
          <CardTitle className="break-words text-sm leading-snug">
            {row.name}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="grid min-w-0 gap-2 p-2 pt-0 md:grid-cols-[minmax(180px,0.75fr)_minmax(280px,1fr)]">
        <div className="min-w-0 space-y-1.5">
          <CardDescription>Ед. изм / Цена</CardDescription>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums">
              <span className="text-muted-foreground">Ед.:</span>
              <span>{row.unit}</span>
            </Badge>
            <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums">
              <span className="text-muted-foreground">Цена:</span>
              <span>{priceLabel}</span>
            </Badge>
          </div>
        </div>

        <div className="min-w-0 space-y-1.5">
          <CardDescription>Категория / Поставщик</CardDescription>
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
      </CardContent>
    </Card>
  )
}
