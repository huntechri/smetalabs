import dotenv from "dotenv";
dotenv.config();

async function main() {
  const { supabase } = await import("../db/index.js");

  const projectId = "d2384323-2f98-450e-8501-01eb6223735a";
  
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_owner_id")
    .eq("id", projectId)
    .single();

  const workspaceOwnerId = project.workspace_owner_id;

  const toNumber = (val: any) => {
    const parsed = typeof val === "number" ? val : Number(val ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const roundMoney = (val: number) => Math.round(val * 100) / 100

  // 1. Fetch estimate record IDs and amounts
  const { data: estimates } = await supabase
    .from("project_estimate_records")
    .select("id, amount")
    .eq("project_id", projectId)
    .eq("workspace_owner_id", workspaceOwnerId)
    .is("deleted_at", null)
    .is("archived_at", null);

  const estimateIds = estimates.map((e) => e.id);

  // 2. Fetch payments (with date)
  const { data: payments } = await supabase
    .from("project_estimate_payments")
    .select("amount, date")
    .in("estimate_record_id", estimateIds)
    .eq("workspace_owner_id", workspaceOwnerId)
    .is("deleted_at", null)
    .in("status", ["conducted", "processing"]);

  // 3. Fetch estimate-level purchases (with purchase_date)
  const { data: estPurchases } = await supabase
    .from("project_estimate_purchases")
    .select("total, purchase_date")
    .in("estimate_record_id", estimateIds)
    .eq("workspace_owner_id", workspaceOwnerId)
    .is("deleted_at", null)
    .is("archived_at", null);

  // Fetch project-level global purchases (with purchase_date)
  const { data: globPurchases } = await supabase
    .from("global_purchases")
    .select("fact_quantity, fact_price, purchase_date")
    .eq("project_id", projectId)
    .eq("workspace_owner_id", workspaceOwnerId)
    .is("deleted_at", null)
    .is("archived_at", null);

  console.log("DEBUG: globPurchases in function:", globPurchases);

  const materialsEstSpent = (estPurchases ?? []).reduce((sum, p) => sum + toNumber(p.total), 0);
  const materialsGlobSpent = (globPurchases ?? []).reduce((sum, p) => {
    const qty = toNumber(p.fact_quantity)
    const price = toNumber(p.fact_price)
    return sum + qty * price
  }, 0);

  console.log("DEBUG: materialsGlobSpent:", materialsGlobSpent);

  const transactions: any[] = [];
  (globPurchases ?? []).forEach((p) => {
    const qty = toNumber(p.fact_quantity)
    const price = toNumber(p.fact_price)
    const amount = qty * price
    console.log(`DEBUG: for item: qty=${qty}, price=${price}, amount=${amount}, purchase_date=${p.purchase_date}`);
    if (amount > 0 && p.purchase_date) {
      transactions.push({
        type: "purchase",
        amount: roundMoney(amount),
        date: p.purchase_date,
      });
    }
  });

  console.log("DEBUG: transactions pushed from global purchases:", transactions);
}

main().catch(console.error);
