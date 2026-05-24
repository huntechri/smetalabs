import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/formatters"

export function PurchaseValue({
  className,
  deviation = false,
  isMoney = true,
  label,
  strong = false,
  value,
}: {
  className?: string
  deviation?: boolean
  isMoney?: boolean
  label: string
  strong?: boolean
  value: number | string | null
}) {
  const hasValue = value !== null && value !== undefined

  const displayValue = (() => {
    if (!hasValue) return "—"
    const num = Number(value)
    if (deviation && !isNaN(num)) {
      const sign = num > 0 ? "+" : ""
      return `${sign}${formatMoney(num)}`
    }
    if (isMoney && typeof value === "number") {
      return formatMoney(num)
    }
    // plain number (quantity, etc.) — no currency suffix
    if (typeof value === "number") {
      return String(num)
    }
    return String(value)
  })()

  const deviationVariant = (() => {
    if (!deviation || !hasValue) return ""
    const num = Number(value)
    if (isNaN(num)) return ""
    if (num > 0) return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
    if (num < 0) return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
    return "border-transparent"
  })()

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums",
        strong && "font-semibold",
        deviationVariant,
        !hasValue && "text-muted-foreground/60",
        className
      )}
    >
      <span
        className={
          !hasValue ? "text-muted-foreground/60" : "text-muted-foreground"
        }
      >
        {label}:
      </span>
      <span>{displayValue}</span>
    </Badge>
  )
}
