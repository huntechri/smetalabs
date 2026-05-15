import { DirectoryMaterialsSection } from "@/features/directory-materials/directory-materials-details/components/directory-materials-section"

export function DirectoryMaterialsView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border bg-background p-1">
        <DirectoryMaterialsSection />
      </div>
    </div>
  )
}
