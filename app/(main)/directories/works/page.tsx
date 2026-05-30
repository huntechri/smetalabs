import { WorksToolbar } from "@/features/directories/ui/works-toolbar"
import { DirectoryWorksView } from "@/features/directory-works/components/directory-works-view"

export default function WorksDirectoryPage() {
  return (
    <div className="@container/main flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-6 lg:px-6">
      <WorksToolbar />
      <DirectoryWorksView />
    </div>
  )
}
