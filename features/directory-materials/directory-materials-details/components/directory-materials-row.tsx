import { Button } from "@/components/ui/button"
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
import { DirectoryMaterialsName } from "./directory-materials-name"
import { DirectoryMaterialsValue } from "./directory-materials-value"
import { DirectoryMaterialsMetricGroup } from "./directory-materials-metric-group"

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
    <div className="mx-3 my-1.5 grid gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/50 xl:grid-cols-[minmax(520px,1.15fr)_minmax(520px,0.85fr)]">
      <div className="grid min-w-0 gap-3 rounded-md border border-border p-2 sm:grid-cols-[minmax(96px,0.18fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-md border border-border p-2">
          <span className="mb-1 block text-xs text-muted-foreground uppercase">
            Код
          </span>
          <div className="break-words text-sm font-medium leading-snug">
            {row.code || "—"}
          </div>
        </div>
        <DirectoryMaterialsName value={row.name} />
      </div>

      <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-[minmax(180px,0.75fr)_minmax(280px,1fr)]">
        <DirectoryMaterialsMetricGroup title="Ед. изм / Цена">
          <DirectoryMaterialsValue label="Ед." value={row.unit} />
          <DirectoryMaterialsValue label="Цена" strong value={priceLabel} />
        </DirectoryMaterialsMetricGroup>

        <DirectoryMaterialsMetricGroup title="Категория / Поставщик">
          <DirectoryMaterialsValue label="Кат." value={row.category} />
          {row.supplierName ? (
            <DirectoryMaterialsValue label="Пост." value={row.supplierName} />
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
        </DirectoryMaterialsMetricGroup>
      </div>
    </div>
  )
}
