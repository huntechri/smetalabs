// ─── Перечисления и примитивные типы ────────────────────────────────────────

export type CounterpartyType = "customer" | "contractor"
export type LegalStatus = "juridical" | "individual"
export type DirectoryCounterpartyStatus = "active" | "archived"
export type DirectoryCounterpartiesSort =
  | "relevance"
  | "updated_desc"
  | "name_asc"

// ─── Вложенные типы данных ───────────────────────────────────────────────────

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

// ─── Параметры запросов ──────────────────────────────────────────────────────

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

// ─── Сущности домена ─────────────────────────────────────────────────────────

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

/** @deprecated Используйте DirectoryCounterparty */
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

// ─── События (Custom Events) ─────────────────────────────────────────────────

/** Имя события, которое испускает CounterpartiesToolbar при нажатии «Добавить» */
export const DIRECTORY_COUNTERPARTIES_CREATE_EVENT =
  "directory-counterparties:create"

// ─── Доменные хелперы (чистые функции) ──────────────────────────────────────

/** Человекочитаемое название типа контрагента */
export function getCounterpartyTypeLabel(type: CounterpartyType): string {
  return type === "customer" ? "Заказчик" : "Подрядчик"
}

/** Человекочитаемое название правового статуса */
export function getLegalStatusLabel(status: LegalStatus): string {
  return status === "juridical" ? "Юр. лицо" : "Физ. лицо"
}

// ─── Хелперы парсинга URL-параметров (используются в application/) ───────────

type ReadonlySearchParams = {
  get: (name: string) => string | null
}

export function getStringParam(
  searchParams: ReadonlySearchParams,
  key: string
): string | undefined {
  const value = searchParams.get(key)?.trim()
  return value || undefined
}

export function getNumberParam(
  searchParams: ReadonlySearchParams,
  key: string
): number | undefined {
  const value = searchParams.get(key)
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

export function getSortParam(
  searchParams: ReadonlySearchParams
): DirectoryCounterpartiesSort | undefined {
  const sort = searchParams.get("sort")
  if (sort === "relevance" || sort === "updated_desc" || sort === "name_asc")
    return sort
  return undefined
}

export function getListParams(
  searchParams: ReadonlySearchParams
): DirectoryCounterpartiesListParams {
  return {
    q: getStringParam(searchParams, "q"),
    status: searchParams.get("status") === "archived" ? "archived" : "active",
    limit: getNumberParam(searchParams, "limit") ?? 50,
    cursor: getNumberParam(searchParams, "cursor") ?? 0,
    sort: getSortParam(searchParams) ?? "relevance",
  }
}
