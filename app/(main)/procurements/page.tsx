import { Suspense } from "react"
import { GlobalPurchasesToolbar } from "@/features/global-purchases/global-purchases-details/components/global-purchases-toolbar"
import { GlobalPurchasesView } from "@/features/global-purchases/global-purchases-details/components/global-purchases-view"

export default function ProcurementsPage() {
  return (
    <div className="@container/main flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-6 lg:px-6">
      <Suspense fallback={null}>
        <GlobalPurchasesToolbar />
      </Suspense>
      <GlobalPurchasesView />
    </div>
  )
}
