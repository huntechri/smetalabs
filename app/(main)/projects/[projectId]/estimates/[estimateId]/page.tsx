"use client"

import { useState } from "react"
import { EstimateSection } from "@/features/estimates/components/estimate-section"
import { EstimateEmptyState } from "@/features/estimates/components/estimate-empty-state"
import { CreateSectionDialog } from "@/features/estimates/components/create-section-dialog"

export default function EstimateDetailsPage() {
  const [isCreated, setIsCreated] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateSection = (data: { name: string; number: string }) => {
    console.log("Creating section:", data)
    setIsCreated(true)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col rounded-xl border border-dashed border-red-500 p-1">
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
