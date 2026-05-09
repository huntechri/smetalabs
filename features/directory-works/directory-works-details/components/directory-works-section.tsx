"use client"

import { useDirectoryWorks } from "@/features/directory-works/hooks/use-directory-works"
import { DirectoryWorksRow } from "./directory-works-row"

export function DirectoryWorksSection() {
  const { works } = useDirectoryWorks()

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col">
        {works.map((row) => (
          <DirectoryWorksRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
