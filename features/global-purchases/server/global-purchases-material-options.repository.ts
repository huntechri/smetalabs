import { supabase } from "@/db"
import type { GlobalPurchaseMaterialOption } from "@/types/global-purchases"

type MaterialOptionDbRow = {
  id: string
  name: string
  unit_code: string
  unit_label: string
  price_amount: string | number
  category: string
}

const MATERIAL_OPTION_SELECT = "id,name,unit_code,unit_label,price_amount,category"

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function toNumber(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapMaterialOption(row: MaterialOptionDbRow): GlobalPurchaseMaterialOption {
  return {
    id: row.id,
    title: row.name,
    unit: row.unit_label || row.unit_code,
    planPrice: toNumber(row.price_amount),
    category: row.category,
  }
}

export async function searchGlobalPurchaseMaterialOptionsForWorkspace(
  workspaceOwnerId: string,
  queryText: string
): Promise<GlobalPurchaseMaterialOption[]> {
  const normalizedQuery = normalizeSearch(queryText)
  if (normalizedQuery.length < 2) return []

  const { data, error } = await supabase
    .from("directory_materials")
    .select(MATERIAL_OPTION_SELECT)
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", "active")
    .is("deleted_at", null)
    .textSearch("search_fts", normalizedQuery, { type: "websearch", config: "simple" })
    .order("normalized_name", { ascending: true })
    .limit(25)

  if (error) throw error

  return ((data ?? []) as MaterialOptionDbRow[]).map(mapMaterialOption)
}
