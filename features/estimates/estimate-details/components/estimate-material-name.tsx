import { Textarea } from "@/components/ui/textarea"

export function EstimateMaterialName({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs text-muted-foreground uppercase">
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
