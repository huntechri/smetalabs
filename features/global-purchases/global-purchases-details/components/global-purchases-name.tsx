export function GlobalPurchasesName({
  value,
  unit,
}: {
  value: string
  unit: string
}) {
  return (
    <div className="min-w-0 rounded-md border border-dashed border-green-300 p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Наименование
      </span>
      <div className="break-words text-sm font-medium leading-snug">
        {value}
      </div>
      <span className="mt-1 inline-block text-xs text-muted-foreground">
        ед. изм: {unit}
      </span>
    </div>
  )
}
