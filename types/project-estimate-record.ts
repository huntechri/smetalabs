export type ProjectEstimateRecordStatus = "new" | "in_progress" | "completed"

export type ProjectEstimateRecordRow = {
  id: string
  projectId: string
  name: string
  type: string
  status: ProjectEstimateRecordStatus
  amount: number
  createdAt: string
  updatedAt: string
  metadata: {
    createdBy: string | null
    updatedBy: string | null
  }
}

export type ProjectEstimateRecordMutationInput = {
  name: string
  type?: string
  status?: ProjectEstimateRecordStatus
}

export type ProjectEstimateRecordsListParams = {
  limit?: number
  cursor?: number
}

export type ProjectEstimateRecordsListResponse = {
  data: ProjectEstimateRecordRow[]
  meta: {
    projectId: string
    limit: number
    cursor: number
    nextCursor: number | null
    hasMore: boolean
    total: number
  }
}
