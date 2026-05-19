export type ProjectEstimateStatus = "new" | "in_progress" | "completed"

export type ProjectEstimateRow = {
  id: string
  projectId: string
  name: string
  type: string
  status: ProjectEstimateStatus
  amount: number
  createdAt: string
  updatedAt: string
  metadata: {
    createdBy: string | null
    updatedBy: string | null
  }
}

export type ProjectEstimateMutationInput = {
  name: string
}

export type ProjectEstimatesListParams = {
  limit?: number
  cursor?: number
}

export type ProjectEstimatesListResponse = {
  data: ProjectEstimateRow[]
  meta: {
    projectId: string
    limit: number
    cursor: number
    nextCursor: number | null
    hasMore: boolean
    total: number
  }
}
