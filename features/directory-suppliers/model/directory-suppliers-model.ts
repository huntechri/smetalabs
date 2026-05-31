export type DirectorySupplierStatus = "active" | "archived"
export type DirectorySupplierLegalStatus = "juridical" | "individual"
export type DirectorySuppliersSort = "relevance" | "updated_desc" | "name_asc"

export type DirectorySuppliersListParams = {
  q?: string
  status?: DirectorySupplierStatus
  limit?: number
  cursor?: number
  sort?: DirectorySuppliersSort
}

export type DirectorySupplierMutationInput = {
  name: string
  legalStatus: DirectorySupplierLegalStatus
  color?: string | null
  inn?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export type DirectorySupplier = {
  id: string
  name: string
  normalizedName: string
  legalStatus: DirectorySupplierLegalStatus
  color: string
  inn: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  status: DirectorySupplierStatus
  version: number
  metadata: {
    createdAt: string
    updatedAt: string
  }
}

export type DirectorySuppliersListMeta = {
  limit: number
  cursor: number
  nextCursor: number | null
  hasMore: boolean
  total: number
}

export type DirectorySuppliersListResponse = {
  data: DirectorySupplier[]
  meta: DirectorySuppliersListMeta
}

export type DirectorySupplierFormState = {
  name: string
  legalStatus: DirectorySupplierLegalStatus
  color: string
  inn: string
  phone: string
  email: string
  address: string
  notes: string
}

export type DirectorySupplierColorPreset = {
  value: string
  label: string
}

export const DIRECTORY_SUPPLIERS_CREATE_EVENT = "directory-suppliers:create"

export const DEFAULT_DIRECTORY_SUPPLIER_COLOR = "#64748B"

export const DIRECTORY_SUPPLIER_COLOR_PRESETS: DirectorySupplierColorPreset[] = [
  { value: "#3B82F6", label: "Синий" },
  { value: "#EF4444", label: "Красный" },
  { value: "#10B981", label: "Зелёный" },
  { value: "#F59E0B", label: "Янтарный" },
  { value: "#8B5CF6", label: "Фиолетовый" },
  { value: "#06B6D4", label: "Голубой" },
  { value: "#EC4899", label: "Розовый" },
  { value: "#EAB308", label: "Жёлтый" },
  { value: "#6366F1", label: "Индиго" },
  { value: "#64748B", label: "Серый" },
]

type ReadonlySearchParams = {
  get: (name: string) => string | null
}

export function getSupplierLegalStatusLabel(
  status: DirectorySupplierLegalStatus
): string {
  return status === "juridical" ? "Юр. лицо" : "Физ. лицо"
}

export function isValidSupplierColorHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

export function formatSupplierColorInput(value: string): string {
  if (!value) return value
  return (value.startsWith("#") ? value : `#${value}`).toUpperCase()
}

export function getDirectorySupplierInitialFormState(
  supplier?: DirectorySupplier | null
): DirectorySupplierFormState {
  return {
    name: supplier?.name ?? "",
    color: supplier?.color ?? DEFAULT_DIRECTORY_SUPPLIER_COLOR,
    legalStatus: supplier?.legalStatus ?? "juridical",
    inn: supplier?.inn ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    address: supplier?.address ?? "",
    notes: supplier?.notes ?? "",
  }
}

export function buildDirectorySupplierMutationInput(
  state: DirectorySupplierFormState
): DirectorySupplierMutationInput {
  return {
    name: state.name,
    legalStatus: state.legalStatus,
    color: state.color,
    inn: state.inn,
    phone: state.phone,
    email: state.email,
    address: state.address,
    notes: state.notes,
  }
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

export function getSuppliersSortParam(
  searchParams: ReadonlySearchParams
): DirectorySuppliersSort | undefined {
  const sort = searchParams.get("sort")
  if (sort === "relevance" || sort === "updated_desc" || sort === "name_asc") {
    return sort
  }
  return undefined
}

export function getDirectorySuppliersListParams(
  searchParams: ReadonlySearchParams
): DirectorySuppliersListParams {
  return {
    q: getStringParam(searchParams, "q"),
    status: searchParams.get("status") === "archived" ? "archived" : "active",
    limit: getNumberParam(searchParams, "limit") ?? 50,
    cursor: getNumberParam(searchParams, "cursor") ?? 0,
    sort: getSuppliersSortParam(searchParams) ?? "relevance",
  }
}
