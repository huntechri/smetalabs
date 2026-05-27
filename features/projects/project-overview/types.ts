import type {
  ProjectEstimateRecordRow,
  ProjectEstimateRecordStatus,
} from "@/types/project-estimate-record"

export type EstimateRow = ProjectEstimateRecordRow

export type EstimateDialogState = {
  open: boolean
  estimate: EstimateRow | null
  name: string
  type: string
  status: ProjectEstimateRecordStatus
  error: string | null
}
