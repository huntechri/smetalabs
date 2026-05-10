"use client"

import { useDirectoryCounterparties } from "@/features/directory-counterparties/hooks/use-directory-counterparties"
import { DirectoryCounterpartiesRow } from "./directory-counterparties-row"

export function DirectoryCounterpartiesSection() {
  const { counterparties } = useDirectoryCounterparties()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {counterparties.map((row) => (
          <DirectoryCounterpartiesRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
