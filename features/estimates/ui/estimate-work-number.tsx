export function EstimateWorkNumber({ value }: { value: string }) {
  return (
    <div className="flex w-12 shrink-0 items-center justify-center gap-1 rounded-md border bg-background px-2 py-1">
      <span className="text-xs text-muted-foreground">№</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  )
}
