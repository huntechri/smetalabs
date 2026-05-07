"use client"

import { useState } from "react"
import { CreateSectionDialog } from "@/features/estimates/estimate-details/components/create-section-dialog"
import { EstimateEmptyState } from "@/features/estimates/estimate-details/components/estimate-empty-state"
import { EstimateSection } from "@/features/estimates/estimate-details/components/estimate-section"

export default function EstimateDetailsPage() {
  const [isCreated, setIsCreated] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateSection = (data: { name: string; number: string }) => {
    console.log("Creating section:", data)
    setIsCreated(true)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border border-dashed border-red-500 p-1">
        {isCreated ? (
          <EstimateSection />
        ) : (
          <EstimateEmptyState onCreateClick={() => setIsDialogOpen(true)} />
        )}
      </div>

      <CreateSectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleCreateSection}
      />
    </div>
  )
}
