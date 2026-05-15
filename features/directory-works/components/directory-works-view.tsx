import { Suspense } from "react"
import { DirectoryWorksSection } from "@/features/directory-works/directory-works-details/components/directory-works-section"

export function DirectoryWorksView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 rounded-xl border border-border p-1">
        <Suspense
          fallback={
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
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
