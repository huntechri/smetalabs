import { GlobalPurchasesSection } from "@/features/global-purchases/global-purchases-details/components/global-purchases-section"

export function GlobalPurchasesView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-500 p-1">
        <GlobalPurchasesSection />
      </div>
    </div>
  )
}
