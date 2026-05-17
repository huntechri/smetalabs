import { DirectoryCounterpartiesSection } from "@/features/directory-counterparties/directory-counterparties-details/components/directory-counterparties-section"

export function DirectoryCounterpartiesView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-border p-1">
        <DirectoryCounterpartiesSection />
      </div>
    </div>
  )
}
