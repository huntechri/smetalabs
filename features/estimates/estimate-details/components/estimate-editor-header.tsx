import { Badge } from "@/components/ui/badge"
import { formatEstimateStatusText } from "@/features/estimates/estimate-details/lib/estimate-editor-form"
import { formatMoney } from "@/lib/formatters"
import type { EstimateContentData } from "@/features/estimates/estimate-details/types"

export function EstimateEditorHeader({
  content,
  isFetching,
  message,
  saving,
}: {
  content: EstimateContentData
  isFetching: boolean
  message: string | null
  saving: boolean
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-sm font-medium font-heading">{content.record.name}</h1>
          <Badge variant="outline">
            {formatEstimateStatusText(content.record.status)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Работы: {formatMoney(content.summary.worksAmount)}</span>
          <span>Материалы: {formatMoney(content.summary.materialsAmount)}</span>
          <span>Итого: {formatMoney(content.summary.totalAmount)}</span>
          {isFetching ? <span>обновление...</span> : null}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {saving ? "Сохраняется" : message}
      </div>
    </div>
  )
}
