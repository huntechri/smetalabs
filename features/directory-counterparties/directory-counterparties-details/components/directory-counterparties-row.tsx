import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DirectoryCounterparty } from "@/features/directory-counterparties/types"
import {
  ArchiveIcon,
  GearSixIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { DirectoryCounterpartiesMetricGroup } from "./directory-counterparties-metric-group"
import { DirectoryCounterpartiesName } from "./directory-counterparties-name"
import { DirectoryCounterpartiesValue } from "./directory-counterparties-value"

export function DirectoryCounterpartiesRow({
  onArchive,
  onEdit,
  row,
  saving,
}: {
  onArchive: (row: DirectoryCounterparty) => void
  onEdit: (row: DirectoryCounterparty) => void
  row: DirectoryCounterparty
  saving: boolean
}) {
  const typeLabel = row.type === "customer" ? "Заказчик" : "Подрядчик"
  const legalStatusLabel =
    row.legalStatus === "juridical" ? "Юр. лицо" : "Физ. лицо"

  return (
    <div className="mx-3 my-1.5 grid gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/50 xl:grid-cols-[minmax(420px,1fr)_minmax(560px,0.95fr)]">
      <div className="grid min-w-0 gap-3 rounded-md border border-border p-2 sm:grid-cols-[minmax(0,1fr)]">
        <DirectoryCounterpartiesName value={row.name} />
      </div>

      <div className={cn(
        "grid min-w-0 gap-1.5 rounded-md border border-border p-1.5",
        row.legalStatus === "juridical"
          ? "md:grid-cols-[minmax(150px,0.7fr)_minmax(150px,0.7fr)_minmax(220px,1fr)]"
          : "md:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)]"
      )}>
        <DirectoryCounterpartiesMetricGroup title="Тип">
          <Badge
            variant={row.type === "customer" ? "default" : "secondary"}
            className="gap-1 rounded-md px-1.5 py-0.5 font-normal"
          >
            {typeLabel}
          </Badge>
          <Badge
            variant={row.legalStatus === "juridical" ? "default" : "secondary"}
            className="gap-1 rounded-md px-1.5 py-0.5 font-normal"
          >
            {legalStatusLabel}
          </Badge>
        </DirectoryCounterpartiesMetricGroup>

        <DirectoryCounterpartiesMetricGroup title="Контакты">
          <div className="flex items-center justify-between gap-1.5 w-full">
            <DirectoryCounterpartiesValue label="Тел." value={row.phone} />
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
        </DirectoryCounterpartiesMetricGroup>

        {row.legalStatus === "juridical" && (
          <DirectoryCounterpartiesMetricGroup title="Банк / БИК">
            <DirectoryCounterpartiesValue
              label="Банк"
              value={row.bankDetails.bankName}
            />
            <DirectoryCounterpartiesValue
              label="БИК"
              value={row.bankDetails.bik}
            />
          </DirectoryCounterpartiesMetricGroup>
        )}
      </div>
    </div>
  )
}
