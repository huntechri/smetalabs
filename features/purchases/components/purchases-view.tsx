import { PurchaseSection } from "@/features/purchases/purchase-details/components/purchase-section"

export function PurchasesView({
  estimateId,
  projectId,
}: {
  estimateId: string
  projectId: string
}) {
  return (
    <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-lg border bg-background p-1">
      <PurchaseSection estimateId={estimateId} projectId={projectId} />
    </div>
  )
}
