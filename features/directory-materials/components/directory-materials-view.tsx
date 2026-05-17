import { Suspense } from "react"
import {
  DirectoryMaterialsRowsSkeleton,
  DirectoryMaterialsSection,
} from "@/features/directory-materials/directory-materials-details/components/directory-materials-section"

export function DirectoryMaterialsView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 rounded-xl border border-border p-1">
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
              <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
                <DirectoryMaterialsRowsSkeleton />
              </div>
            </div>
          }
        >
          <DirectoryMaterialsSection />
        </Suspense>
      </div>
    </div>
  )
}
