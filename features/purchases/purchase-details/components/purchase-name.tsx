import { cn } from "@/lib/utils"

export function PurchaseName({
  title,
  className,
}: {
  title: string
  className?: string
}) {
  return (
    <div className={cn("min-w-0 rounded-md border border-border p-2", className)}>
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Наименование
      </span>
      <div className="text-sm leading-snug font-semibold break-words">
        {title}
      </div>
    </div>
  )
}
