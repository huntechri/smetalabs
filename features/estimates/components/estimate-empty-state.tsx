import { Button } from "@/components/ui/button"
import { FileArrowDown, Plus } from "@phosphor-icons/react"

interface EstimateEmptyStateProps {
  onCreateClick: () => void
}

export function EstimateEmptyState({ onCreateClick }: EstimateEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-gray-400 p-12 text-center">
      <div className="flex flex-col items-center gap-4">
        {/* Иконка-заглушка */}
        <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-gray-400">
          <Plus className="size-8 text-gray-400" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">
            Разделы отсутствуют
          </h3>
          <p className="text-sm text-muted-foreground">
            Создайте первый раздел сметы или импортируйте данные из файла.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onCreateClick} className="gap-2">
            <Plus className="size-4" />
            Создать раздел
          </Button>
          <Button variant="outline" className="gap-2">
            <FileArrowDown className="size-4" />
            Импорт
          </Button>
        </div>
      </div>
    </div>
  )
}
