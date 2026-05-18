import { supabase } from "@/db"
import type { GlobalPurchaseSupplierOption } from "@/types/global-purchases"

type SupplierOptionDbRow = {
  id: string
  name: string
  color: string
}

export async function listGlobalPurchaseSuppliersForWorkspace(
  workspaceOwnerId: string
): Promise<GlobalPurchaseSupplierOption[]> {
  const { data, error } = await supabase
    .from("directory_suppliers")
    .select("id,name,color")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("normalized_name", { ascending: true })
    .limit(100)

  if (error) throw error

  return ((data ?? []) as SupplierOptionDbRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
  }))
}

export async function getSupplierSnapshotForWorkspace(
  workspaceOwnerId: string,
  supplierId?: string | null
): Promise<GlobalPurchaseSupplierOption | null> {
  if (!supplierId) return null

  const { data, error } = await supabase
    .from("directory_suppliers")
    .select("id,name,color")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("id", supplierId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as SupplierOptionDbRow
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  }
}
