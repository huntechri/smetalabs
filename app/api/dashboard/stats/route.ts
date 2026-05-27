import { NextResponse } from "next/server"
import { getWorkspaceDashboardStats } from "@/features/projects/server/projects.service"
import { handleProjectsRouteError } from "@/features/projects/server/projects.route-handlers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const response = await getWorkspaceDashboardStats()
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[GET /api/dashboard/stats]")
  }
}
