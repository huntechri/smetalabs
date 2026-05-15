import { Suspense } from "react"
import { DirectoryWorksSection } from "@/features/directory-works/directory-works-details/components/directory-works-section"

export function DirectoryWorksView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-600 p-1">
        <Suspense
          fallback={
            <div className="rounded-lg border border-dashed border-blue-600 p-4 text-sm text-muted-foreground">
              Загрузка работ...
            </div>
          }
        >
          <DirectoryWorksSection />
        </Suspense>
      </div>
    </div>
  )
}
