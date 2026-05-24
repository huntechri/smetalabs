import { PurchaseSection } from "@/features/purchases/purchase-details/components/purchase-section"

export function PurchasesView({
  estimateId,
  projectId,
}: {
  estimateId: string
  projectId: string
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-500 p-1">
        <PurchaseSection estimateId={estimateId} projectId={projectId} />
      </div>
    </div>
  )
}
