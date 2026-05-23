export function DirectoryCounterpartiesName({ value }: { value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Название / ФИО
      </span>
      <div className="text-sm leading-snug font-medium break-words">
        {value}
      </div>
    </div>
  )
}
