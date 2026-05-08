import { ExecutionSection } from "@/features/execution/execution-details/components/execution-section"

export function ExecutionView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-500 p-1">
        <ExecutionSection />
      </div>
    </div>
  )
}
