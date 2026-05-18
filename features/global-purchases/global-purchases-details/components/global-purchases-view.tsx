import { Suspense } from "react"
import {
  GlobalPurchasesRowsSkeleton,
  GlobalPurchasesSection,
} from "@/features/global-purchases/global-purchases-details/components/global-purchases-section"
import type { GlobalPurchaseSupplierOption } from "@/types/global-purchases"
import type { ProjectRow } from "@/types/project"

export function GlobalPurchasesView({
  projects,
  projectsLoading,
  suppliers,
  suppliersLoading,
}: {
  projects: ProjectRow[]
  projectsLoading: boolean
  suppliers: GlobalPurchaseSupplierOption[]
  suppliersLoading: boolean
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 rounded-xl border border-border p-1">
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
              <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
                <GlobalPurchasesRowsSkeleton />
              </div>
            </div>
          }
        >
          <GlobalPurchasesSection
            projects={projects}
            projectsLoading={projectsLoading}
            suppliers={suppliers}
            suppliersLoading={suppliersLoading}
          />
        </Suspense>
      </div>
    </div>
  )
}
