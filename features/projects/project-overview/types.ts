import type { ProjectEstimateRecordRow } from "@/types/project-estimate-record"

export type EstimateRow = ProjectEstimateRecordRow

export type EstimateDialogState = {
  open: boolean
  estimate: EstimateRow | null
  name: string
  error: string | null
}
