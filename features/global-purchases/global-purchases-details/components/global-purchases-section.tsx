"use client"

import { useGlobalPurchases } from "@/features/global-purchases/hooks/use-global-purchases"
import { GlobalPurchasesRow } from "./global-purchases-row"

export function GlobalPurchasesSection() {
  const { purchases, updateGlobalPurchase } = useGlobalPurchases()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {purchases.map((row) => (
          <GlobalPurchasesRow key={row.id} row={row} onUpdate={updateGlobalPurchase} />
        ))}
      </div>
    </section>
  )
}
