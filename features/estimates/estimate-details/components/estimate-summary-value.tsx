import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/formatters"

export function EstimateSummaryValue({
  label,
  strong = false,
  value,
  variant = "dashed",
  className,
}: {
  label: string
  strong?: boolean
  value: number | string
  variant?: "dashed" | "clean"
  className?: string
}) {
  return (
    <div
      className={cn(
        "min-w-0",
        variant === "dashed" && "rounded-md border border-dashed p-2",
        className
      )}
    >
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("truncate text-xs font-semibold text-foreground mt-0.5", strong && "font-bold")}>
        {typeof value === "number" ? formatMoney(value) : value}
      </div>
    </div>
  )
}
