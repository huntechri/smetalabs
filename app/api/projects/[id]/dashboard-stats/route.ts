import { NextRequest } from "next/server"
import { handleProjectDashboardStatsRequest } from "@/features/projects/server/projects.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleProjectDashboardStatsRequest(id)
}
