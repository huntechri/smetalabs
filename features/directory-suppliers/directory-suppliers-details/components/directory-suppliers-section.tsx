"use client"

import { useDirectorySuppliers } from "@/features/directory-suppliers/hooks/use-directory-suppliers"
import { DirectorySuppliersRow } from "./directory-suppliers-row"

export function DirectorySuppliersSection() {
  const { suppliers } = useDirectorySuppliers()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {suppliers.map((row) => (
          <DirectorySuppliersRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
