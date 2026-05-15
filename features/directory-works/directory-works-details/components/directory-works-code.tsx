export function DirectoryWorksCode({ value }: { value: string | null }) {
  const code = value?.trim()

  return (
    <div className="min-w-0 rounded-md border border-border p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Код
      </span>
      <div className="break-words font-mono text-xs font-medium leading-snug">
        {code || "—"}
      </div>
    </div>
  )
}
