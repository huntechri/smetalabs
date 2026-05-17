export type CounterpartyType = "customer" | "contractor"
export type LegalStatus = "juridical" | "individual"
export type DirectoryCounterpartyStatus = "active" | "archived"
export type DirectoryCounterpartiesSort = "relevance" | "updated_desc" | "name_asc"

export type BankDetails = {
  bankName: string | null
  bik: string | null
  corrAccount: string | null
  accountNumber: string | null
}

export type PassportData = {
  series: string | null
  number: string | null
  issuedBy: string | null
  issueDate: string | null
  departmentCode: string | null
  registrationAddress: string | null
}

export type DirectoryCounterpartiesListParams = {
  q?: string
  status?: DirectoryCounterpartyStatus
  limit?: number
  cursor?: number
  sort?: DirectoryCounterpartiesSort
}

export type DirectoryCounterpartyMutationInput = {
  name: string
  type: CounterpartyType
  legalStatus: LegalStatus
  inn?: string | null
  phone?: string | null
  legalAddress?: string | null
  bankName?: string | null
  bik?: string | null
  corrAccount?: string | null
  accountNumber?: string | null
  passportSeries?: string | null
  passportNumber?: string | null
  passportIssuedBy?: string | null
  passportIssueDate?: string | null
  passportDepartmentCode?: string | null
  registrationAddress?: string | null
}

export type DirectoryCounterparty = {
  id: string
  name: string
  type: CounterpartyType
  legalStatus: LegalStatus
  inn: string | null
  phone: string | null
  legalAddress: string | null
  bankDetails: BankDetails
  passport: PassportData
  status: DirectoryCounterpartyStatus
  version: number
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string | null
    updatedBy: string | null
  }
}

export type DirectoryCounterpartyRow = DirectoryCounterparty

export type DirectoryCounterpartiesListMeta = {
  limit: number
  cursor: number
  nextCursor: number | null
  hasMore: boolean
  total: number
}

export type DirectoryCounterpartiesListResponse = {
  data: DirectoryCounterparty[]
  meta: DirectoryCounterpartiesListMeta
}
