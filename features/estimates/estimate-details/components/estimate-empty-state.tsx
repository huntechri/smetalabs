import { Button } from "@/components/ui/button"
import { FileArrowDown, Plus } from "@phosphor-icons/react"

interface EstimateEmptyStateProps {
  onCreateClick: () => void
}

export function EstimateEmptyState({ onCreateClick }: EstimateEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-gray-400 p-6 sm:p-8 md:p-12 text-center">
      <div className="flex flex-col items-center gap-4">
        {/* Placeholder icon */}
        <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-gray-400">
          <Plus className="size-8 text-gray-400" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">
            No sections yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Create your first estimate section or import data from a file.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onCreateClick} className="gap-2">
            <Plus className="size-4" />
            Create section
          </Button>
          <Button variant="outline" className="gap-2">
            <FileArrowDown className="size-4" />
            Import
          </Button>
        </div>
      </div>
    </div>
  )
}
