import { EstimateNavigationTabs } from "@/features/estimates/components/estimate-navigation-tabs"
import { EstimateTabToolbar } from "@/features/estimates/estimate-tabs/components/estimate-tab-toolbar"

export default function EstimateDetailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="@container/main flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-6 lg:px-6">
      <EstimateNavigationTabs />
      <EstimateTabToolbar />
      {children}
    </div>
  )
}
