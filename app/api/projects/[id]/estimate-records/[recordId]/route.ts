import { NextRequest } from "next/server"
import { handleProjectEstimateRecordUpdateRequest } from "@/features/projects/server/project-estimate-records.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string; recordId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id, recordId } = await params
  return handleProjectEstimateRecordUpdateRequest(request, id, recordId)
}
