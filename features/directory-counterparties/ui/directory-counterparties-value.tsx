import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function DirectoryCounterpartiesValue({
  className,
  label,
  strong = false,
  value,
}: {
  className?: string
  label: string
  strong?: boolean
  value?: number | string | null
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums",
        strong && "font-semibold",
        className
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span>{value || "—"}</span>
    </Badge>
  )
}
