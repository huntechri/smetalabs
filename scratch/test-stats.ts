import dotenv from "dotenv";
dotenv.config();

async function main() {
  const { supabase } = await import("../db/index.js");
  const { getProjectDashboardStatsForWorkspace } = await import("../features/projects/server/projects.repository.js");

  const projectId = "d2384323-2f98-450e-8501-01eb6223735a";
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_owner_id")
    .eq("id", projectId)
    .single();

  const stats = await getProjectDashboardStatsForWorkspace(project.workspace_owner_id, projectId);
  console.log("All transactions:", stats.transactions);
}

main().catch(console.error);
