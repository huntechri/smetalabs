export type CounterpartyType = "customer" | "contractor"
export type LegalStatus = "juridical" | "individual"

export type BankDetails = {
  bankName: string
  bik: string
  corrAccount: string
  accountNumber: string
}

export type PassportData = {
  series: string
  number: string
  issuedBy: string
  issueDate: string
  departmentCode: string
  registrationAddress: string
}

export type DirectoryCounterpartyRow = {
  id: string
  name: string
  type: CounterpartyType
  legalStatus: LegalStatus
  inn: string
  phone: string
  legalAddress?: string
  bankDetails?: BankDetails
  passport?: PassportData
}
