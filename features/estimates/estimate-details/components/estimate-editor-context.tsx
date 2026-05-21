"use client"

import * as React from "react"
import type { EstimateContentChangeInput } from "@/features/estimates/api/project-estimate-content-client"
import type {
  EstimateArchive,
  EstimateContentData,
} from "@/features/estimates/estimate-details/types"
import type { ProjectEstimateContentWork } from "@/types/project-estimate-content"

export type MoveDirection = "up" | "down"

export type EstimateSave = (
  input: EstimateContentChangeInput,
  fallback: string,
) => Promise<EstimateContentData | null>

export type EstimateEditorContextValue = {
  savingIds: Set<string>
  reorderDisabled: boolean
  onSave: EstimateSave
  onArchive: EstimateArchive
  onMoveSection: (sectionId: string, direction: MoveDirection) => void
  onMoveWork: (sectionId: string, workId: string, direction: MoveDirection) => void
  onMoveMaterial: (workId: string, materialId: string, direction: MoveDirection) => void
  onAddSection: () => void
  onAddWork: (sectionId: string) => void
  onAddMaterial: (work: ProjectEstimateContentWork) => void
  onReplaceWork: (work: ProjectEstimateContentWork) => void
}

const EstimateEditorContext = React.createContext<EstimateEditorContextValue | null>(null)

export function useEstimateEditorContext(): EstimateEditorContextValue {
  const ctx = React.useContext(EstimateEditorContext)
  if (!ctx) {
    throw new Error(
      "useEstimateEditorContext must be used within <EstimateEditorContext.Provider>",
    )
  }
  return ctx
}

export { EstimateEditorContext }
