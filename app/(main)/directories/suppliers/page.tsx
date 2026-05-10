import { SuppliersToolbar } from "@/features/directories/components/suppliers-toolbar"
import { DirectorySuppliersView } from "@/features/directory-suppliers/components/directory-suppliers-view"

export default function SuppliersDirectoryPage() {
  return (
    <div className="@container/main flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-6 lg:px-6">
      <SuppliersToolbar />
      <DirectorySuppliersView />
    </div>
  )
}
