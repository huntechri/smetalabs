import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import { DirectoryWorksSection } from "@/features/directory-works/directory-works-details/components/directory-works-section"

export function DirectoryWorksView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 rounded-xl border border-border p-1">
        <Suspense
          fallback={
            <div className="flex h-full min-h-32 items-center justify-center gap-2 rounded-lg border border-border p-4 text-xs/relaxed text-muted-foreground">
              <Spinner className="size-4" />
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
