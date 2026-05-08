import { usePurchases } from "@/features/purchases/hooks/use-purchases"
import { PurchaseRow } from "./purchase-row"

export function PurchaseSection() {
  const { purchases } = usePurchases()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {purchases.map((row) => (
          <PurchaseRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
