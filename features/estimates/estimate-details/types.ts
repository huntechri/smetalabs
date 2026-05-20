import type { EstimateContentChangeInput } from "@/features/estimates/api/project-estimate-content-client"
import type {
  ProjectEstimateContentResponse,
  ProjectEstimateContentWork,
  ProjectEstimateMaterialOptionRow,
  ProjectEstimateOptionRow,
} from "@/types/project-estimate-content"

export type EstimateContentData = ProjectEstimateContentResponse["data"]

export type EstimateSave = (
  input: EstimateContentChangeInput,
  fallback: string
) => Promise<EstimateContentData>

export type WorkDialogState = {
  open: boolean
  sectionId: string | null
  selected: ProjectEstimateOptionRow | null
}

export type MaterialDialogState = {
  open: boolean
  work: ProjectEstimateContentWork | null
  selected: ProjectEstimateMaterialOptionRow | null
}

export type MaterialChangePayload = {
  title?: string
  quantity?: number
  consumption?: number | null
  price?: number
  changedField?: "quantity" | "consumption" | "price"
}
