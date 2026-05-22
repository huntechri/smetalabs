import { Textarea } from "@/components/ui/textarea"

export function EstimateMaterialName({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="block min-w-0 rounded-md border bg-background p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Наименование
      </span>
      <Textarea
        className="min-h-16"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}
