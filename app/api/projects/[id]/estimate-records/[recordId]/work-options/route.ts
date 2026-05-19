import { NextRequest } from "next/server"
import { handleProjectEstimateWorkOptionsRequest } from "@/features/projects/server/project-estimate-content.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string; recordId: string }> }

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id, recordId } = await params
  return handleProjectEstimateWorkOptionsRequest(request, id, recordId)
}
