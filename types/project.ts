export type ProjectStatus = "new" | "in_progress" | "completed"

export type ProjectRow = {
  id: string
  title: string
  status: ProjectStatus
  progress: number
  customerCounterpartyId: string | null
  customerName: string | null
  address: string | null
  budgetAmount: number | null
  startDate: string | null
  endDate: string | null
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string | null
    updatedBy: string | null
  }
}

export type ProjectsSort = "updated_desc" | "title_asc" | "relevance"

export type ProjectsListParams = {
  q?: string
  status?: ProjectStatus | "all"
  limit?: number
  cursor?: number
  sort?: ProjectsSort
}

export type ProjectsListResponse = {
  data: ProjectRow[]
  meta: {
    limit: number
    cursor: number
    nextCursor: number | null
    hasMore: boolean
    total: number
  }
}

export type ProjectMutationInput = {
  title: string
  customerCounterpartyId?: string | null
  address?: string | null
  startDate?: string | null
  endDate?: string | null
  status?: ProjectStatus
}
