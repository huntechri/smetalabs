export function PurchaseName({
  title,
  unit,
}: {
  title: string
  unit: string
}) {
  return (
    <div className="min-w-0 rounded-md border border-dashed border-green-300 p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Наименование
      </span>
      <div className="text-sm leading-snug font-medium break-words">
        {title}
      </div>
      <span className="mt-0.5 block text-xs text-muted-foreground">
        {unit}
      </span>
    </div>
  )
}
