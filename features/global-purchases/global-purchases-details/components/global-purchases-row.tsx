import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { GlobalPurchaseRow, GlobalPurchaseStatus } from "@/types/global-purchases"
import { ArchiveIcon, GearSixIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react"

const statusLabels: Record<GlobalPurchaseStatus, string> = {
  planned: "План",
  ordered: "Заказано",
  partially_received: "Частично получено",
  received: "Получено",
  cancelled: "Отменено",
}

function formatMoney(value: number | null) {
  if (value === null) return "—"
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
}

function formatNumber(value: number | null) {
  if (value === null) return "—"
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("ru-RU")
}

export function GlobalPurchasesRow({
  onArchive,
  onEdit,
  onInsertAfter,
  row,
  saving,
}: {
  onArchive: (row: GlobalPurchaseRow) => void
  onEdit: (row: GlobalPurchaseRow) => void
  onInsertAfter: (row: GlobalPurchaseRow) => void
  row: GlobalPurchaseRow
  saving: boolean
}) {
  return (
    <div className="mx-3 my-1.5 grid gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/50 xl:grid-cols-[minmax(420px,1fr)_minmax(620px,1fr)]">
      <div className="grid min-w-0 gap-3 rounded-md border border-border p-2 sm:grid-cols-[minmax(0,1fr)_minmax(160px,0.35fr)]">
        <div className="min-w-0 rounded-md border border-border p-2">
          <span className="mb-1 block text-xs text-muted-foreground uppercase">ЗАКУПКА</span>
          <div className="break-words text-sm font-medium leading-snug">{row.title}</div>
          <div className="mt-1 flex min-w-0 flex-wrap gap-1.5">
            <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal"><span className="text-muted-foreground">Ед.:</span><span>{row.unit}</span></Badge>
            <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal"><span>{statusLabels[row.status]}</span></Badge>
          </div>
        </div>
        <div className="min-w-0 rounded-md border border-border p-2">
          <span className="mb-1 block text-xs text-muted-foreground uppercase">ДАТА</span>
          <div className="text-xs font-medium leading-snug">{formatDate(row.purchaseDate)}</div>
        </div>
      </div>
      <div className="grid min-w-0 gap-1.5 rounded-md border border-border p-1.5 md:grid-cols-[minmax(240px,0.85fr)_minmax(260px,0.9fr)_minmax(160px,0.35fr)]">
        <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
          <div className="text-xs text-muted-foreground uppercase">ПЛАН</div>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums"><span className="text-muted-foreground">Кол-во:</span><span>{formatNumber(row.planQuantity)}</span></Badge>
            <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-medium tabular-nums"><span>{formatMoney(row.planTotal)}</span></Badge>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
          <div className="text-xs text-muted-foreground uppercase">ФАКТ / ОБЪЕКТ</div>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums"><span className="text-muted-foreground">Факт:</span><span>{formatMoney(row.factTotal)}</span></Badge>
            <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums"><span className="text-muted-foreground">Откл.:</span><span>{formatMoney(row.deviationTotal)}</span></Badge>
            {row.projectTitle ? <Badge variant="outline" className="max-w-full gap-1 rounded-md px-1.5 py-0.5 font-normal"><span className="text-muted-foreground">Объект:</span><span className="truncate">{row.projectTitle}</span></Badge> : null}
          </div>
        </div>
        <div className="flex min-w-0 items-start justify-end rounded-md border border-border p-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button aria-label={`Действия для ${row.title}`} disabled={saving} size="icon-sm" type="button" variant="ghost"><GearSixIcon /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onInsertAfter(row)}><PlusIcon />Добавить ниже</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(row)}><PencilSimpleIcon />Редактировать</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onArchive(row)} variant="destructive"><ArchiveIcon />Архивировать</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
