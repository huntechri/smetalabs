import { MaterialsToolbar } from "@/features/directories/ui/materials-toolbar"
import { DirectoryMaterialsView } from "@/features/directory-materials/ui/directory-materials-view"

export default function MaterialsDirectoryPage() {
  return (
    <div className="@container/main flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-6 lg:px-6">
      <MaterialsToolbar />
      <DirectoryMaterialsView />
    </div>
  )
}
