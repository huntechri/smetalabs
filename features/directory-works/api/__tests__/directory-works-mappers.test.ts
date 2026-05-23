import { describe, expect, it } from "vitest"
import { getExactTotalCount, getTotalCount } from "../directory-works-mappers"
import type { DirectoryWorkRpcRow } from "../directory-works-mappers"

const baseRow: DirectoryWorkRpcRow = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "Работа",
  unit_code: "m2",
  unit_label: "м2",
  rate_amount: 100,
  currency_code: "RUB",
  price_kind: "base",
  category: "Отделка",
  subcategory: null,
  code: "A-1",
  description: null,
  included_operations: null,
  excluded_operations: null,
  source_name: null,
  source_external_row_key: null,
  status: "active",
  version: 1,
  created_at: "2026-05-14T00:00:00.000Z",
  updated_at: "2026-05-14T00:00:00.000Z",
  aliases: [],
  keywords: [],
  search_rank: null,
  total_count: null,
}

describe("directory works mappers", () => {
  it("uses exact RPC totals when they are present", () => {
    const rows = [{ ...baseRow, total_count: "42" }]

    expect(getExactTotalCount(rows)).toBe(42)
    expect(getTotalCount(rows, 100, 1, true)).toBe(42)
  })

  it("reports browse fast-path totals as lower bounds", () => {
    const rows = [
      baseRow,
      { ...baseRow, id: "550e8400-e29b-41d4-a716-446655440001" },
    ]

    expect(getExactTotalCount(rows)).toBeNull()
    expect(getTotalCount(rows, 5000, 1, true)).toBe(5002)
    expect(getTotalCount(rows.slice(0, 1), 5000, 1, false)).toBe(5001)
  })
})
