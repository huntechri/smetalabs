import { Textarea } from "@/components/ui/textarea"

export function EstimateName({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="min-w-48 flex-1 rounded-md border bg-background p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Название
      </span>
      <Textarea
        className="min-h-16"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}
