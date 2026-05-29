import { Badge } from "@/components/ui/badge"

export function StatusBadge({
  status,
  variantMap,
  labelMap,
}: {
  status: string
  variantMap: Record<string, React.ComponentProps<typeof Badge>["variant"]>
  labelMap: Record<string, string>
}) {
  return (
    <Badge variant={variantMap[status] ?? "outline"} className="text-xs">
      {labelMap[status] ?? status}
    </Badge>
  )
}
