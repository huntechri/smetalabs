import { ExecutionSection } from "@/features/execution/execution-details/components/execution-section"

export function ExecutionView() {
  return (
    <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-lg border bg-background p-1">
      <ExecutionSection />
    </div>
  )
}
