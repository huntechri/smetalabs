import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/formatters"

export function EstimateSummaryValue({
  label,
  strong = false,
  value,
}: {
  label: string
  strong?: boolean
  value: number | string
}) {
  return (
    <div className="min-w-0 rounded-md border border-dashed p-2">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className={cn("truncate text-xs", strong && "font-semibold")}>
        {typeof value === "number" ? formatMoney(value) : value}
      </div>
    </div>
  )
}
