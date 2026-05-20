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

export type EstimateArchiveRequest = {
  input: EstimateContentChangeInput
  title: string
  description: string
  fallback: string
}

export type EstimateArchive = (request: EstimateArchiveRequest) => void

export type WorkDialogMode = "add" | "replace"

export type WorkDialogState = {
  open: boolean
  mode: WorkDialogMode
  sectionId: string | null
  work: ProjectEstimateContentWork | null
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
