import { supabase } from "@/db"
import { DirectoryCounterpartiesApiError } from "../api/directory-counterparties-errors"
import type {
  DirectoryCounterpartiesListParams,
  DirectoryCounterpartiesListResponse,
  DirectoryCounterparty,
  DirectoryCounterpartyMutationInput,
} from "../types"

type NormalizedListParams = Required<
  Pick<DirectoryCounterpartiesListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<DirectoryCounterpartiesListParams, "status" | "limit" | "cursor" | "sort">

type DirectoryCounterpartyDbRow = {
  id: string
  name: string
  type: "customer" | "contractor"
  legal_status: "juridical" | "individual"
  inn: string | null
  phone: string | null
  legal_address: string | null
  bank_name: string | null
  bik: string | null
  corr_account: string | null
  account_number: string | null
  passport_series: string | null
  passport_number: string | null
  passport_issued_by: string | null
  passport_issue_date: string | null
  passport_department_code: string | null
  registration_address: string | null
  status: "active" | "archived"
  version: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

const COUNTERPARTY_SELECT = [
  "id",
  "name",
  "type",
  "legal_status",
  "inn",
  "phone",
  "legal_address",
  "bank_name",
  "bik",
  "corr_account",
  "account_number",
  "passport_series",
  "passport_number",
  "passport_issued_by",
  "passport_issue_date",
  "passport_department_code",
  "registration_address",
  "status",
  "version",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(",")

const MAX_SEARCH_TOKENS = 8

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`)
}

function getSearchTokens(value: string) {
  const normalized = normalizeSearch(value)
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) ?? []

  return Array.from(new Set(tokens)).slice(0, MAX_SEARCH_TOKENS)
}

function toNullableString(value: string | null | undefined) {
  return value && value.trim() ? value.trim().replace(/\s+/g, " ") : null
}

function mapDirectoryCounterpartyRow(row: DirectoryCounterpartyDbRow): DirectoryCounterparty {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    legalStatus: row.legal_status,
    inn: row.inn,
    phone: row.phone,
    legalAddress: row.legal_address,
    bankDetails: {
      bankName: row.bank_name,
      bik: row.bik,
      corrAccount: row.corr_account,
      accountNumber: row.account_number,
    },
    passport: {
      series: row.passport_series,
      number: row.passport_number,
      issuedBy: row.passport_issued_by,
      issueDate: row.passport_issue_date,
      departmentCode: row.passport_department_code,
      registrationAddress: row.registration_address,
    },
    status: row.status,
    version: row.version,
    metadata: {
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    },
  }
}

function applyDirectoryCounterpartyFilters<T extends { or: (filters: string) => T }>(
  query: T,
  params: NormalizedListParams
) {
  let scoped = query

  if (params.q) {
    const tokens = getSearchTokens(params.q)

    for (const token of tokens) {
      const q = escapeLike(token)
      scoped = scoped.or(
        [
          `normalized_name.ilike.%${q}%`,
          `search_text.ilike.%${q}%`,
          `inn.ilike.%${q}%`,
          `phone.ilike.%${q}%`,
          `bik.ilike.%${q}%`,
          `account_number.ilike.%${q}%`,
          `passport_series.ilike.%${q}%`,
          `passport_number.ilike.%${q}%`,
        ].join(",")
      )
    }
  }

  return scoped
}

function applyDirectoryCounterpartySort<T extends { order: (column: string, options?: { ascending?: boolean }) => T }>(
  query: T,
  params: NormalizedListParams
) {
  if (params.sort === "name_asc") {
    return query.order("normalized_name", { ascending: true }).order("id", { ascending: true })
  }

  return query.order("updated_at", { ascending: false }).order("id", { ascending: true })
}

async function assertDirectoryCounterpartyUniqueFields(
  workspaceOwnerId: string,
  input: DirectoryCounterpartyMutationInput,
  currentCounterpartyId?: string
) {
  const inn = input.inn?.trim()
  if (!inn) return

  let query = supabase
    .from("directory_counterparties")
    .select("id")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("inn", inn)
    .is("deleted_at", null)
    .limit(1)

  if (currentCounterpartyId) query = query.neq("id", currentCounterpartyId)

  const { data, error } = await query
  if (error) throw error
  if ((data ?? []).length > 0) {
    throw new DirectoryCounterpartiesApiError("BAD_REQUEST", "Контрагент с таким ИНН уже существует", 400)
  }
}

function toCounterpartyMutationRow(
  workspaceOwnerId: string,
  userId: string,
  input: DirectoryCounterpartyMutationInput
) {
  const isJuridical = input.legalStatus === "juridical"

  return {
    workspace_owner_id: workspaceOwnerId,
    name: input.name.trim().replace(/\s+/g, " "),
    normalized_name: "pending",
    type: input.type,
    legal_status: input.legalStatus,
    inn: toNullableString(input.inn),
    phone: toNullableString(input.phone),
    legal_address: isJuridical ? toNullableString(input.legalAddress) : null,
    bank_name: isJuridical ? toNullableString(input.bankName) : null,
    bik: isJuridical ? toNullableString(input.bik) : null,
    corr_account: isJuridical ? toNullableString(input.corrAccount) : null,
    account_number: isJuridical ? toNullableString(input.accountNumber) : null,
    passport_series: isJuridical ? null : toNullableString(input.passportSeries),
    passport_number: isJuridical ? null : toNullableString(input.passportNumber),
    passport_issued_by: isJuridical ? null : toNullableString(input.passportIssuedBy),
    passport_issue_date: isJuridical ? null : toNullableString(input.passportIssueDate),
    passport_department_code: isJuridical ? null : toNullableString(input.passportDepartmentCode),
    registration_address: isJuridical ? null : toNullableString(input.registrationAddress),
    search_text: "pending",
    updated_by: userId,
  }
}

export async function listDirectoryCounterpartiesForWorkspace(
  workspaceOwnerId: string,
  params: NormalizedListParams
): Promise<DirectoryCounterpartiesListResponse> {
  const from = params.cursor
  const to = params.cursor + params.limit

  let query = supabase
    .from("directory_counterparties")
    .select(COUNTERPARTY_SELECT, { count: "exact" })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", params.status)
    .is("deleted_at", null)

  query = applyDirectoryCounterpartyFilters(query, params)
  query = applyDirectoryCounterpartySort(query, params)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  const rows = ((data ?? []) as DirectoryCounterpartyDbRow[]).filter(Boolean)
  const visibleRows = rows.slice(0, params.limit)
  const hasMore = rows.length > params.limit

  return {
    data: visibleRows.map(mapDirectoryCounterpartyRow),
    meta: {
      limit: params.limit,
      cursor: params.cursor,
      nextCursor: hasMore ? params.cursor + params.limit : null,
      hasMore,
      total: count ?? params.cursor + visibleRows.length + (hasMore ? 1 : 0),
    },
  }
}

export async function getDirectoryCounterpartyForWorkspace(
  workspaceOwnerId: string,
  id: string
): Promise<DirectoryCounterparty | null> {
  const { data, error } = await supabase
    .from("directory_counterparties")
    .select(COUNTERPARTY_SELECT)
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }

  return mapDirectoryCounterpartyRow(data as DirectoryCounterpartyDbRow)
}

export async function createDirectoryCounterpartyForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  input: DirectoryCounterpartyMutationInput
): Promise<DirectoryCounterparty> {
  await assertDirectoryCounterpartyUniqueFields(workspaceOwnerId, input)

  const { data, error } = await supabase
    .from("directory_counterparties")
    .insert({
      ...toCounterpartyMutationRow(workspaceOwnerId, userId, input),
      status: "active",
      version: 1,
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) throw error

  const counterparty = await getDirectoryCounterpartyForWorkspace(workspaceOwnerId, data.id)
  if (!counterparty) {
    throw new DirectoryCounterpartiesApiError("INTERNAL_ERROR", "Созданный контрагент не найден", 500)
  }

  return counterparty
}

export async function updateDirectoryCounterpartyForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string,
  input: DirectoryCounterpartyMutationInput
): Promise<DirectoryCounterparty> {
  const existing = await getDirectoryCounterpartyForWorkspace(workspaceOwnerId, id)
  if (!existing) throw new DirectoryCounterpartiesApiError("NOT_FOUND", "Контрагент не найден", 404)

  await assertDirectoryCounterpartyUniqueFields(workspaceOwnerId, input, id)

  const { error } = await supabase
    .from("directory_counterparties")
    .update({ ...toCounterpartyMutationRow(workspaceOwnerId, userId, input), version: existing.version + 1 })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("deleted_at", null)

  if (error) throw error

  const counterparty = await getDirectoryCounterpartyForWorkspace(workspaceOwnerId, id)
  if (!counterparty) {
    throw new DirectoryCounterpartiesApiError("INTERNAL_ERROR", "Обновлённый контрагент не найден", 500)
  }

  return counterparty
}

export async function archiveDirectoryCounterpartyForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  id: string
): Promise<DirectoryCounterparty> {
  const existing = await getDirectoryCounterpartyForWorkspace(workspaceOwnerId, id)
  if (!existing) throw new DirectoryCounterpartiesApiError("NOT_FOUND", "Контрагент не найден", 404)

  const { error } = await supabase
    .from("directory_counterparties")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      updated_by: userId,
      version: existing.version + 1,
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", id)
    .is("deleted_at", null)

  if (error) throw error

  const counterparty = await getDirectoryCounterpartyForWorkspace(workspaceOwnerId, id)
  if (!counterparty) {
    throw new DirectoryCounterpartiesApiError("INTERNAL_ERROR", "Архивированный контрагент не найден", 500)
  }

  return counterparty
}
