import { CounterpartiesToolbar } from "@/features/directories/components/counterparties-toolbar"
import { DirectoryCounterpartiesView } from "@/features/directory-counterparties/components/directory-counterparties-view"

export default function CounterpartiesDirectoryPage() {
  return (
    <div className="@container/main flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-6 lg:px-6">
      <CounterpartiesToolbar />
      <DirectoryCounterpartiesView />
    </div>
  )
}
