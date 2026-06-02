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
        <Button onClick={onCreateClick}>
          <Plus data-icon="inline-start" />
          Создать раздел
        </Button>
        <Button variant="outline">
          <FileArrowDown data-icon="inline-start" />
          Импорт
        </Button>
      </EmptyContent>
    </Empty>
  )
}
