import { Suspense } from "react"
import {
  DirectorySuppliersRowsSkeleton,
  DirectorySuppliersSection,
} from "@/features/directory-suppliers/directory-suppliers-details/components/directory-suppliers-section"

export function DirectorySuppliersView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 rounded-xl border border-border p-1">
        <Suspense fallback={<DirectorySuppliersRowsSkeleton />}>
          <DirectorySuppliersSection />
        </Suspense>
      </div>
    </div>
  )
}
