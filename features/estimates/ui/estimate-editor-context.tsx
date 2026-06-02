"use client"

import * as React from "react"
import type {
  EstimateArchive,
} from "@/features/estimates/ui/types"
import type { ProjectEstimateContentWork } from "@/types/project-estimate-content"

export type MoveDirection = "up" | "down"

export type EstimateEditorContextValue = {
  savingIds: Set<string>
  reorderDisabled: boolean
  onArchive: EstimateArchive
  onMoveSection: (sectionId: string, direction: MoveDirection) => void
  onMoveWork: (
    sectionId: string,
    workId: string,
    direction: MoveDirection
  ) => void
  onAddSection: () => void
  onAddWork: (sectionId: string) => void
  onAddMaterial: (work: ProjectEstimateContentWork) => void
  onReplaceWork: (work: ProjectEstimateContentWork) => void
  onUpdateWork: (
    workId: string,
    payload: { title?: string; quantity?: number; price?: number }
  ) => void
  onUpdateMaterial: (
    materialId: string,
    payload: {
      title?: string
      quantity?: number
      consumption?: number | null
      price?: number
      changedField?: "quantity" | "consumption" | "price" | "workQuantity"
    }
  ) => void
}

const EstimateEditorContext =
  React.createContext<EstimateEditorContextValue | null>(null)

export function useEstimateEditorContext(): EstimateEditorContextValue {
  const ctx = React.useContext(EstimateEditorContext)
  if (!ctx) {
    throw new Error(
      "useEstimateEditorContext must be used within <EstimateEditorContext.Provider>"
    )
  }
  return ctx
}

export { EstimateEditorContext }
