import { EstimateNavigationTabs } from "@/features/estimates/components/estimate-navigation-tabs"

export default function EstimateDetailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <EstimateNavigationTabs />
      {children}
    </div>
  )
}
