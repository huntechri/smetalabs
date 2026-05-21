import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { FileArrowDown, Plus } from "@phosphor-icons/react"

interface EstimateEmptyStateProps {
  onCreateClick: () => void
}

export function EstimateEmptyState({ onCreateClick }: EstimateEmptyStateProps) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>Пока нет разделов</EmptyTitle>
        <EmptyDescription>
          Создайте первый раздел сметы или импортируйте данные из файла.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreateClick} className="gap-2">
          <Plus className="size-4" />
          Создать раздел
        </Button>
        <Button variant="outline" className="gap-2">
          <FileArrowDown className="size-4" />
          Импорт
        </Button>
      </EmptyContent>
    </Empty>
  )
}
