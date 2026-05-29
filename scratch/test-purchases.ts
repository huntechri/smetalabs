import dotenv from "dotenv"
dotenv.config()

async function main() {
  const { supabase } = await import("../db/index.js")

  const projectId = "d2384323-2f98-450e-8501-01eb6223735a"

  // Get estimate records for the project
  const { data: estimates } = await supabase
    .from("project_estimate_records")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null)

  const estimateIds = (estimates ?? []).map((e) => e.id)

  console.log("Estimate IDs:", estimateIds)

  // Query project_estimate_purchases
  const { data: estPurchases } = await supabase
    .from("project_estimate_purchases")
    .select("id, title, total, purchase_date, estimate_record_id")
    .in("estimate_record_id", estimateIds)
    .is("deleted_at", null)

  console.log("Local Estimate Purchases count:", estPurchases?.length ?? 0)
  console.log("Local Estimate Purchases:", estPurchases)

  // Query global_purchases
  const { data: globPurchases } = await supabase
    .from("global_purchases")
    .select("id, title, fact_quantity, fact_price, purchase_date, project_id")
    .eq("project_id", projectId)
    .is("deleted_at", null)

  console.log("Global Purchases count:", globPurchases?.length ?? 0)
  console.log("Global Purchases:", globPurchases)
}

main().catch(console.error)
