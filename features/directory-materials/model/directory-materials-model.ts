import type {
  DirectoryMaterial,
  DirectoryMaterialMutationInput,
  DirectoryMaterialsListMeta,
  DirectoryMaterialsListParams,
  DirectoryMaterialsSort,
} from "../types"

export const DEFAULT_DIRECTORY_MATERIALS_LIMIT = 50

export type ReadonlySearchParams = {
  get: (name: string) => string | null
}

export type DirectoryMaterialFormState = {
  name: string
  unit: string
  price: string
  category: string
  subcategory: string
  code: string
  supplierName: string
}

export type DirectoryMaterialFormBuildResult =
  | { ok: true; input: DirectoryMaterialMutationInput }
  | { ok: false; error: string }

export type DirectoryMaterialsPageState = {
  currentCursor: number
  currentLimit: number
  pageStart: number
  pageEnd: number
  totalLabel: string
  previousCursor: number
  nextCursor: number
}

export const EMPTY_DIRECTORY_MATERIAL_FORM_STATE: DirectoryMaterialFormState = {
  name: "",
  unit: "",
  price: "",
  category: "",
  subcategory: "",
  code: "",
  supplierName: "",
}

export function getDirectoryMaterialInitialFormState(
  material: DirectoryMaterial | null
): DirectoryMaterialFormState {
  if (!material) return EMPTY_DIRECTORY_MATERIAL_FORM_STATE

  return {
    name: material.name,
    unit: material.unitLabel || material.unit,
    price: String(material.priceAmount),
    category: material.category,
    subcategory: material.subcategory ?? "",
    code: material.code ?? "",
    supplierName: material.supplierName ?? "",
  }
}

export function buildDirectoryMaterialMutationInput(
  state: DirectoryMaterialFormState,
  material: DirectoryMaterial | null
): DirectoryMaterialFormBuildResult {
  const name = state.name.trim()
  const unit = state.unit.trim()
  const category = state.category.trim()
  const subcategory = state.subcategory.trim()
  const code = state.code.trim()
  const supplierName = state.supplierName.trim()
  const price = Number(state.price)

  if (!name || !unit || !category) {
    return {
      ok: false,
      error: "Заполните название, единицу измерения и категорию",
    }
  }

  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Цена должна быть неотрицательным числом" }
  }

  return {
    ok: true,
    input: {
      name,
      unit,
      price,
      category,
      subcategory: subcategory || null,
      code: code || null,
      supplierName: supplierName || null,
      imageUrl: material?.imageUrl ?? null,
      description: material?.description ?? null,
      sourceName: material?.metadata.sourceName ?? null,
      sourceExternalRowKey: material?.metadata.sourceExternalRowKey ?? null,
      currencyCode: material?.currencyCode ?? "RUB",
    },
  }
}

export function getDirectoryMaterialFormErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось сохранить материал"
}

export function getDirectoryMaterialArchiveConfirmMessage(
  material: DirectoryMaterial
) {
  return `Архивировать материал «${material.name}»? Он исчезнет из активного списка.`
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

export function getDirectoryMaterialsSortParam(
  searchParams: ReadonlySearchParams
): DirectoryMaterialsSort | undefined {
  const sort = searchParams.get("sort")
  if (sort === "relevance" || sort === "updated_desc" || sort === "name_asc") {
    return sort
  }
  return undefined
}

export function getDirectoryMaterialsListParams(
  searchParams: ReadonlySearchParams
): DirectoryMaterialsListParams {
  return {
    q: getStringParam(searchParams, "q"),
    category: getStringParam(searchParams, "category"),
    subcategory: getStringParam(searchParams, "subcategory"),
    unit: getStringParam(searchParams, "unit"),
    status: searchParams.get("status") === "archived" ? "archived" : "active",
    supplier: getStringParam(searchParams, "supplier"),
    limit: getNumberParam(searchParams, "limit") ?? DEFAULT_DIRECTORY_MATERIALS_LIMIT,
    cursor: getNumberParam(searchParams, "cursor") ?? 0,
    sort: getDirectoryMaterialsSortParam(searchParams) ?? "relevance",
  }
}

export function getDirectoryMaterialsPageState({
  materialCount,
  meta,
  params,
}: {
  materialCount: number
  meta: DirectoryMaterialsListMeta | null
  params: DirectoryMaterialsListParams
}): DirectoryMaterialsPageState {
  const currentCursor = params.cursor ?? 0
  const currentLimit = params.limit ?? meta?.limit ?? DEFAULT_DIRECTORY_MATERIALS_LIMIT
  const pageStart = materialCount > 0 ? currentCursor + 1 : 0
  const pageEnd = currentCursor + materialCount
  const totalLabel = meta?.hasMore
    ? `минимум ${meta.total}`
    : String(meta?.total ?? materialCount)
  const previousCursor = Math.max(currentCursor - currentLimit, 0)
  const nextCursor = meta?.nextCursor ?? currentCursor + currentLimit

  return {
    currentCursor,
    currentLimit,
    pageStart,
    pageEnd,
    totalLabel,
    previousCursor,
    nextCursor,
  }
}
