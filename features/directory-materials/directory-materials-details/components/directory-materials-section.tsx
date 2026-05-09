"use client"

import { useDirectoryMaterials } from "@/features/directory-materials/hooks/use-directory-materials"
import { DirectoryMaterialsRow } from "./directory-materials-row"

export function DirectoryMaterialsSection() {
  const { materials } = useDirectoryMaterials()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {materials.map((row) => (
          <DirectoryMaterialsRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
