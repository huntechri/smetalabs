import { PurchaseSection } from "@/features/purchases/purchase-details/components/purchase-section"

export function PurchasesView() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col rounded-xl border border-dashed border-red-500 p-1">
        <PurchaseSection />
      </div>
    </div>
  )
}
