export type ProjectEstimateContentRecord = {
  id: string
  projectId: string
  name: string
  type: string
  status: "new" | "in_progress" | "completed"
  amount: number
  worksCoefficientPercent?: number
  projectName?: string | null
  customerName?: string | null
  projectAddress?: string | null
  workspaceName?: string | null
  workspaceLogo?: string | null
}

export type ProjectEstimateContentMaterial = {
  id: string
  workId: string
  sectionId: string
  number: string
  code: string | null
  title: string
  unitCode: string
  unitLabel: string
  quantity: number
  consumption: number | null
  price: number
  totalAmount: number
  supplierName: string | null
  notes: string | null
  imageUrl?: string | null
  sortOrder: number
}

export type ProjectEstimateContentWork = {
  id: string
  sectionId: string
  number: string
  code: string | null
  title: string
  unitCode: string
  unitLabel: string
  quantity: number
  price: number
  totalAmount: number
  factQuantity: number
  factPrice: number
  factTotalAmount: number
  category: string | null
  notes: string | null
  sortOrder: number
  materialsAmount: number
  totalWithMaterialsAmount: number
  materials: ProjectEstimateContentMaterial[]
}

export type ProjectEstimateContentSection = {
  id: string
  title: string
  number: string
  sortOrder: number
  worksAmount: number
  materialsAmount: number
  totalAmount: number
  works: ProjectEstimateContentWork[]
}

export type ProjectEstimateContentSummary = {
  worksAmount: number
  materialsAmount: number
  totalAmount: number
}

export type ProjectEstimateContentResponse = {
  data: {
    record: ProjectEstimateContentRecord
    sections: ProjectEstimateContentSection[]
    summary: ProjectEstimateContentSummary
  }
  /**
   * Internal signal for targeted re-read optimization.
   * When true, the client merges this section into cached data
   * instead of replacing the entire cache.
   */
  _partial?: boolean
  /**
   * Internal signal for duplicate insert detection.
   * When true, the RPC detected a unique constraint violation
   * and the caller should roll back to the previous snapshot.
   */
  _duplicate?: boolean
}

export type ProjectEstimateOptionRow = {
  id: string
  code: string | null
  title: string
  unitCode: string
  unitLabel: string
  price: number
  category: string
}

export type ProjectEstimateMaterialOptionRow = ProjectEstimateOptionRow & {
  supplierName: string | null
}

export type ProjectEstimateOptionsResponse<T> = {
  data: T[]
  meta: {
    q: string
    limit: number
    cursor: number
    nextCursor: number | null
    hasMore: boolean
  }
}
