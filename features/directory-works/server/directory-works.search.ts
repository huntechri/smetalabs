import type { DirectoryWorksListParams } from "../model/directory-works-model"

export const MAX_DIRECTORY_WORKS_INTERACTIVE_CURSOR = 5000

export function normalizeDirectoryWorkSearchTerm(value: string | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ")
  return normalized ? normalized : undefined
}

export function parseDirectoryWorksCursor(value: string | number | undefined) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0
      ? Math.min(value, MAX_DIRECTORY_WORKS_INTERACTIVE_CURSOR)
      : 0
  }
  if (!value) return 0

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0
    ? Math.min(parsed, MAX_DIRECTORY_WORKS_INTERACTIVE_CURSOR)
    : 0
}

export function normalizeDirectoryWorksListParams(
  params: DirectoryWorksListParams
): Required<
  Pick<DirectoryWorksListParams, "status" | "limit" | "cursor" | "sort">
> &
  Omit<DirectoryWorksListParams, "status" | "limit" | "cursor" | "sort"> {
  return {
    q: normalizeDirectoryWorkSearchTerm(params.q),
    category: normalizeDirectoryWorkSearchTerm(params.category),
    subcategory: normalizeDirectoryWorkSearchTerm(params.subcategory),
    unit: normalizeDirectoryWorkSearchTerm(params.unit),
    status: params.status ?? "active",
    limit: Math.min(Math.max(params.limit ?? 50, 1), 100),
    cursor: parseDirectoryWorksCursor(params.cursor),
    sort: params.sort ?? "relevance",
    recommend: params.recommend,
  }
}
