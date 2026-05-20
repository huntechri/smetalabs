import { Button } from "@/components/ui/button"

export function EstimateEmptyContent({
  saving,
  onCreateSection,
  onCreateWork,
}: {
  saving: boolean
  onCreateSection: () => void
  onCreateWork: () => void
}) {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
      <h2 className="text-lg font-semibold">Смета пока пустая.</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Добавьте раздел или первую работу.
      </p>
      <div className="mt-4 flex gap-2">
        <Button disabled={saving} onClick={onCreateSection}>
          Раздел
        </Button>
        <Button disabled={saving} variant="outline" onClick={onCreateWork}>
          Работа
        </Button>
      </div>
    </div>
  )
}
