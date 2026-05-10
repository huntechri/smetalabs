export function DirectoryCounterpartiesName({ value }: { value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-dashed border-green-300 p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Название
      </span>
      <div className="break-words text-sm font-medium leading-snug">
        {value}
      </div>
    </div>
  )
}
