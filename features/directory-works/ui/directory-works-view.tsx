import { Suspense } from "react"
import {
  DirectoryWorksRowsSkeleton,
  DirectoryWorksSection,
} from "./directory-works-section"

export function DirectoryWorksView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 rounded-xl border border-border p-1">
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-muted/0 text-card-foreground shadow-sm">
              <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
                <DirectoryWorksRowsSkeleton />
              </div>
            </div>
          }
        >
          <DirectoryWorksSection />
        </Suspense>
      </div>
    </div>
  )
}
