import type {
  DirectoryWork,
  DirectoryWorkCategoryOption,
  DirectoryWorkPriceKind,
  DirectoryWorkStatus,
  DirectoryWorkUnitOption,
} from "../types"

export type DirectoryWorkRpcRow = {
  id: string
  title: string
  unit_code: string
  unit_label: string
  rate_amount: number | string
  currency_code: string
  price_kind: DirectoryWorkPriceKind
  category: string
  subcategory: string | null
  code: string | null
  description: string | null
  included_operations: string | null
  excluded_operations: string | null
  source_name: string | null
  source_external_row_key: string | null
  status: DirectoryWorkStatus
  version: number
  created_at: string
  updated_at: string
  aliases: string[] | null
  keywords: string[] | null
  search_rank?: number | string | null
  total_count?: number | string | null
}

export type DirectoryWorkCategoryRpcRow = {
  category: string
  subcategory: string | null
  unit_code: string
  unit_label: string
  total_count: number | string
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function uniqueStrings(values: string[] | null | undefined) {
  return Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter(Boolean))
  )
}

export function mapDirectoryWorkRow(row: DirectoryWorkRpcRow): DirectoryWork {
  const rateAmount = toNumber(row.rate_amount)

  return {
    id: row.id,
    title: row.title,
    unit: row.unit_label || row.unit_code,
    unitCode: row.unit_code,
    unitLabel: row.unit_label,
    rate: rateAmount,
    rateAmount,
    currencyCode: row.currency_code,
    priceKind: row.price_kind,
    category: row.category,
    subcategory: row.subcategory,
    code: row.code,
    description: row.description,
    includedOperations: row.included_operations,
    excludedOperations: row.excluded_operations,
    aliases: uniqueStrings(row.aliases),
    keywords: uniqueStrings(row.keywords),
    status: row.status,
    version: row.version,
    metadata: {
      sourceName: row.source_name,
      sourceExternalRowKey: row.source_external_row_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      searchRank:
        row.search_rank === undefined || row.search_rank === null
          ? null
          : toNumber(row.search_rank),
    },
  }
}

export function mapDirectoryWorkCategories(
  rows: DirectoryWorkCategoryRpcRow[]
) {
  const categories = new Map<string, DirectoryWorkCategoryOption>()
  const subcategoryTotals = new Map<string, number>()
  const units = new Map<string, DirectoryWorkUnitOption>()

  for (const row of rows) {
    const total = toNumber(row.total_count)
    const category = row.category.trim()
    const subcategory = row.subcategory?.trim() || null
    const unitKey = row.unit_code || row.unit_label

    if (!categories.has(category)) {
      categories.set(category, { category, total: 0, subcategories: [] })
    }

    const categoryOption = categories.get(category)!
    categoryOption.total += total

    if (subcategory) {
      const key = `${category}::${subcategory}`
      subcategoryTotals.set(key, (subcategoryTotals.get(key) ?? 0) + total)
    }

    if (!units.has(unitKey)) {
      units.set(unitKey, {
        code: row.unit_code,
        label: row.unit_label,
        total: 0,
      })
    }
    units.get(unitKey)!.total += total
  }

  for (const [key, total] of subcategoryTotals) {
    const [category, name = ""] = key.split("::")
    const option = categories.get(category)
    if (option && name) option.subcategories.push({ name, total })
  }

  const categoryList = Array.from(categories.values()).map((category) => ({
    ...category,
    subcategories: category.subcategories.sort((a, b) =>
      a.name.localeCompare(b.name, "ru")
    ),
  }))

  return {
    categories: categoryList.sort((a, b) =>
      a.category.localeCompare(b.category, "ru")
    ),
    units: Array.from(units.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "ru")
    ),
  }
}

export function getExactTotalCount(rows: DirectoryWorkRpcRow[]) {
  const firstTotal = rows[0]?.total_count
  if (firstTotal === undefined || firstTotal === null) return null
  return toNumber(firstTotal)
}
